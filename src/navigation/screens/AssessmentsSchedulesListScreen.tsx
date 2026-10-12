import React from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import {
  dbDeleteAssessmentSchedule,
  dbDeleteScheduledMeasurementRecordsForAssessmentSchedule,
  dbGetAssessments,
  dbGetAssessmentSchedules,
} from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { assessmentTypeToDisplayForm } from "../enumMappings";
import { frequencyToDisplayForm, getWeekdays } from "./ScheduleScreens/common";
import { AssessmentSchedule } from "../../models/AssessmentSchedule";
import { capitalizeFirstLetter } from "../utils";
import { lStyles } from "../../commonStyles";

type EditMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScheduleScreen"
>;

function ScheduleListItem({
  schedule,
  loadSchedules,
  optionsOpened,
  handleOptionsToggle,
  onPress,
  atLeastOneOptionsOpened,
}: {
  schedule: AssessmentSchedule;
  loadSchedules: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
  atLeastOneOptionsOpened: boolean;
}) {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation<EditMedicineScreenNavigationProp>();
  const theme = useTheme();
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);

  const weekdays = React.useMemo(() => {
    return getWeekdays(i18n.resolvedLanguage || i18n.language);
  }, [i18n.resolvedLanguage, i18n.language]);

  const handleDelete = () => {
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    await dbDeleteScheduledMeasurementRecordsForAssessmentSchedule(
      db,
      schedule.dbId,
    );
    await dbDeleteAssessmentSchedule(db, schedule.dbId);
    setDeleteDialogVisible(false);
    await loadSchedules();
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    handleOptionsToggle();
  };

  const handleEdit = () => {
    navigation.navigate("PartiallyEditAnyScheduleScreen", {
      scheduleId: schedule.dbId,
      scheduleType: "assessment",
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const frequencyLabel = capitalizeFirstLetter(
    frequencyToDisplayForm(
      t,
      weekdays,
      schedule.freq,
      schedule.measurements.map((m) => m.offset),
    ),
  );

  const dateRange = schedule.endDate
    ? `${formatDate(schedule.startDate)} – ${formatDate(schedule.endDate)}`
    : `${formatDate(schedule.startDate)} – ${t("No end date")}`;

  const renderOptions = () => (
    <TouchableOpacity
      style={lStyles.optionsContainer}
      onLongPress={handleOptionsToggle}
    >
      <TouchableOpacity
        style={[
          lStyles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleEdit}
      >
        <Text
          style={[
            lStyles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Edit dates")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          lStyles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleDelete}
      >
        <Text
          style={[
            lStyles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Delete")}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{}}>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Delete confirmation")}
        message={t(
          "This action is going to pernamently delete the schedule and " +
            "all of its associated measurement records. Do you want to proceed?",
        )}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      {optionsOpened && renderOptions()}

      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleOptionsToggle}
        disabled={atLeastOneOptionsOpened}
        style={[
          lStyles.itemContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
          optionsOpened && lStyles.optionsOpened,
        ]}
      >
        <View style={lStyles.itemContent}>
          <Text style={[lStyles.itemTitle, { color: theme.colors.text }]}>
            {schedule.assessment.name}
          </Text>
          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
          >
            {t(assessmentTypeToDisplayForm(schedule.assessment.type))}
          </Text>
          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
          >
            {frequencyLabel}
          </Text>

          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
          >
            {dateRange}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function AssessmentSchedulesListScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [schedules, setSchedules] = React.useState<AssessmentSchedule[]>([]);
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);
  const atLeastOneOptionsOpened = React.useMemo(
    () => optionsOpened.some((v) => v),
    [optionsOpened],
  );
  const [areAssessmentsEmpty, setAreAssessmentsEmpty] =
    React.useState<boolean>(false);

  const loadData = React.useCallback(async () => {
    const result = await dbGetAssessmentSchedules(db);
    setSchedules(result);
    setOptionsOpened(Array.from({ length: result.length }, () => false));
    const assessments = await dbGetAssessments(db);
    if (assessments.length > 0) {
      setAreAssessmentsEmpty(false);
    } else {
      setAreAssessmentsEmpty(true);
    }
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddSchedule = () => {
    if (areAssessmentsEmpty) {
      navigation.navigate("EditAssessmentScreen", { mode: "schedule" });
    } else {
      navigation.navigate("SelectAssessmentScreen", {
        mode: "schedule",
      });
    }
  };

  const renderEmptyState = () => (
    <View style={lStyles.emptyContainer}>
      <Text style={[lStyles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No assessments schedules added yet")}
      </Text>
    </View>
  );

  const createHandleOptionsToggle = (idx: number) => {
    return () => {
      const newValue = !optionsOpened[idx];
      const newOptionsOpened = Array.from(
        { length: optionsOpened.length },
        (_, it) => (it === idx ? newValue : false),
      );
      setOptionsOpened(newOptionsOpened);
    };
  };

  const handleOptionsOff = () => {
    const newOptionsOpened = Array.from(
      { length: optionsOpened.length },
      () => false,
    );
    setOptionsOpened(newOptionsOpened);
  };

  return (
    <DefaultMainContainer>
      <TouchableOpacity
        style={lStyles.overlay}
        activeOpacity={1}
        onPress={handleOptionsOff}
      >
        <ScrollView
          style={lStyles.mainScrollContainer}
          contentContainerStyle={lStyles.mainScrollContentContainer}
        >
          {schedules.length === 0 && renderEmptyState()}
          {schedules.map((s, idx) => {
            return (
              <ScheduleListItem
                key={idx}
                schedule={s}
                optionsOpened={optionsOpened[idx]}
                loadSchedules={loadData}
                onPress={handleOptionsOff}
                handleOptionsToggle={createHandleOptionsToggle(idx)}
                atLeastOneOptionsOpened={atLeastOneOptionsOpened}
              />
            );
          })}

          <TouchableOpacity
            onPress={handleAddSchedule}
            style={[lStyles.addButton, { borderColor: theme.colors.primary }]}
            disabled={atLeastOneOptionsOpened}
          >
            <Text
              style={[lStyles.addButtonText, { color: theme.colors.primary }]}
            >
              {t("+ Add Assessment Schedule")}
            </Text>
          </TouchableOpacity>
          <View style={lStyles.bottomMarginContainer}></View>
        </ScrollView>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}
