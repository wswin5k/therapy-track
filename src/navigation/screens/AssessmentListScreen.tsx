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
  dbDeleteAssessment,
  dbGetAssessments,
  dbGetAssessmentSchedules,
} from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";
import { Assessment } from "../../models/AssessmentSchedule";
import { assessmentTypeToDisplayForm } from "../enumMappings";
import { lStyles } from "../../commonStyles";

function AssessmentListItem({
  assessment,
  hasSchedules,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
  atLeastOneOptionsOpened,
}: {
  assessment: Assessment;
  hasSchedules: boolean;
  loadData: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
  atLeastOneOptionsOpened: boolean;
}) {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const theme = useTheme();
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);
  const [deleteRefusalDialogVisible, setDeleteRefusalDialogVisible] =
    React.useState(false);

  const handleDelete = () => {
    if (hasSchedules) {
      setDeleteRefusalDialogVisible(true);
    } else {
      setDeleteDialogVisible(true);
    }
  };

  const confirmDelete = async () => {
    await dbDeleteAssessment(db, assessment);
    setDeleteDialogVisible(false);
    await loadData();
  };

  const closeDeleteRefusal = () => {
    setDeleteRefusalDialogVisible(false);
    handleOptionsToggle();
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    handleOptionsToggle();
  };

  const handleEdit = () => {
    navigation.navigate("EditAssessmentScreen", {
      assessment: assessment,
      mode: "update-and-go-back",
    });
  };

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
          {t("Edit")}
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
    <View>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Delete confirmation")}
        message={t("Do you want to remove ") + assessment.name + "?"}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <InformationDialog
        visible={deleteRefusalDialogVisible}
        title={t("Assessment has schedules")}
        message={t(
          "Deletetion of the assessment has been refused, because " +
            "it has connected schedules. " +
            "They need to be deleted before the assessment.",
        )}
        closeText={t("Close")}
        onClose={closeDeleteRefusal}
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
            {assessment.name}
          </Text>
          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
          >
            {t(assessmentTypeToDisplayForm(assessment.type))}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function AssessmentListScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [assessements, setAssessments] = React.useState<Assessment[]>([]);
  const [assessmentsWithSchedules, setAssessmentsWithSchedules] =
    React.useState<Set<number>>(new Set());
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);
  const atLeastOneOptionsOpened = React.useMemo(
    () => optionsOpened.some((v) => v),
    [optionsOpened],
  );

  const loadData = React.useCallback(async () => {
    const newAssessments = await dbGetAssessments(db);
    setAssessments(newAssessments);

    const schedulesWitAssessments = await dbGetAssessmentSchedules(db);
    const newAssessmentsWithSchedules = new Set<number>();
    schedulesWitAssessments.forEach((s) => {
      newAssessmentsWithSchedules.add(s.assessment.dbId);
    });
    setAssessmentsWithSchedules(newAssessmentsWithSchedules);

    setOptionsOpened(
      Array.from({ length: newAssessments.length }, () => false),
    );
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddAssessment = () => {
    navigation.navigate("EditAssessmentScreen", { mode: "create-and-go-back" });
  };

  const renderEmptyState = () => (
    <View style={lStyles.emptyContainer}>
      <Text style={[lStyles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No assessments added yet")}
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
          {assessements.length === 0 && renderEmptyState()}
          {assessements.map((a, idx) => {
            return (
              <AssessmentListItem
                key={a.dbId}
                assessment={a}
                hasSchedules={assessmentsWithSchedules.has(a.dbId)}
                optionsOpened={optionsOpened[idx]}
                loadData={loadData}
                onPress={handleOptionsOff}
                handleOptionsToggle={createHandleOptionsToggle(idx)}
                atLeastOneOptionsOpened={atLeastOneOptionsOpened}
              />
            );
          })}
          <TouchableOpacity
            onPress={handleAddAssessment}
            style={[lStyles.addButton, { borderColor: theme.colors.primary }]}
            disabled={atLeastOneOptionsOpened}
          >
            <Text
              style={[lStyles.addButtonText, { color: theme.colors.primary }]}
            >
              {t("+ Add Assessment")}
            </Text>
          </TouchableOpacity>
          <View style={lStyles.bottomMarginContainer}></View>
        </ScrollView>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}
