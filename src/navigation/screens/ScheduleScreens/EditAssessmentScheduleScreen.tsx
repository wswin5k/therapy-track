import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import RNDateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { Group } from "../../../models/Frequency";
import { Frequency, FrequencySelection } from "../../../models/Frequency";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { AssessmentParam, RootStackParamList } from "../..";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetAssessmentSchedules,
  dbGetGroups,
  dbGetUnscheduledMeasurmentRecords,
  dbInsertAssessmentSchedule,
  dbInsertAssessmentScheduleWithAssessment,
} from "../../../models/dbAccess";
import { DefaultMainContainer } from "../../../components/DefaultMainContainer";
import { DropdownPicker } from "../../../components/DropdownPicker";
import { frequencySelectionToDisplayForm } from "../../enumMappings";
import { ModalPicker } from "../../../components/ModalPicker";
import { assingDefaultGroups, frequencySelectionMap } from "./common";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AssessmentSchedule } from "../../../models/AssessmentSchedule";
import { UnscheduledMeasurmentRecord } from "../../../models/Records";
import { normalizeToDate } from "../../utils";

type EditAssessmentScheduleScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScheduleScreen"
>;

export default function EditAssessmentScheduleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation =
    useNavigation<EditAssessmentScheduleScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const [freq, setFreq] = React.useState<FrequencySelection | null>(null);
  const freqRef = React.useRef<Frequency | null>(null);
  const [freqError, setFreqError] = React.useState<boolean>(false);

  const [nMeasurments, setNMeasurments] = React.useState<number>(1);
  const groupsRef = React.useRef<(number | null)[]>(
    Array.from({ length: nMeasurments }, () => null),
  );

  const [isStartDatePickerOpened, setIsStartDatePickerOpened] =
    React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [startDateError, setStartDateError] = React.useState<boolean>(false);
  const [isEndDatePickerOpened, setIsEndDatePickerOpened] =
    React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  const [assessment, setAssessment] = React.useState<AssessmentParam | null>(
    null,
  );
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [defaultGroups, setDefaultGroups] = React.useState<Map<number, number>>(
    new Map(),
  );
  const [groupsErrors, setGroupsErrors] = React.useState<boolean[]>([]);
  const [existingAssessmentSchedules, setExistingAssessmentSchedules] =
    React.useState<AssessmentSchedule[]>([]);
  const [
    existingUnscheduledMeasurmentRecords,
    setExistingUnscheduledMeasurmentRecords,
  ] = React.useState<UnscheduledMeasurmentRecord[]>([]);

  const updateGroupsRefWithDefaults = React.useCallback(() => {
    const defaultGroups = assingDefaultGroups(groups);
    groupsRef.current = Array.from(
      { length: nMeasurments },
      (_, idx) => defaultGroups.get(idx) ?? null,
    );
  }, [groups, nMeasurments]);

  useFocusEffect(
    React.useCallback(
      () => updateGroupsRefWithDefaults(),
      [updateGroupsRefWithDefaults],
    ),
  );

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          assessment: AssessmentParam;
          scheduleId?: number;
        };
        setAssessment(params.assessment);

        const newGroups = await dbGetGroups(db);
        setGroups(newGroups);
        setGroupsErrors(Array.from({ length: newGroups.length }, () => false));
        setDefaultGroups(assingDefaultGroups(newGroups));

        const newExistingAssessmentSchedules = (
          await dbGetAssessmentSchedules(db)
        ).filter(
          (a) =>
            !params.assessment.dbId ||
            a.assessment.dbId === params.assessment.dbId,
        );
        setExistingAssessmentSchedules(newExistingAssessmentSchedules);

        const newExistingUnscheduledMeasurmentRecords = (
          await dbGetUnscheduledMeasurmentRecords(db)
        ).filter(
          (a) =>
            !params.assessment.dbId ||
            a.assessmentId === params.assessment.dbId,
        );
        setExistingUnscheduledMeasurmentRecords(
          newExistingUnscheduledMeasurmentRecords,
        );
      };
      setData();
    }, [db, route.params]),
  );

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };
  const handleStartDateChange = (_: DateTimePickerChangeEvent, date?: Date) => {
    if (date) {
      setStartDate(normalizeToDate(date));
      setStartDateError(false);
    }
    setIsStartDatePickerOpened(false);
  };
  const handleStartDateDismiss = () => {
    setIsStartDatePickerOpened(false);
  };
  const handleStartDateClear = () => {
    setStartDate(null);
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };
  const handleEndDateChange = (_: DateTimePickerChangeEvent, date?: Date) => {
    if (date) {
      setEndDate(normalizeToDate(date));
    }
    setIsEndDatePickerOpened(false);
  };
  const handeEndDateDismiss = () => {
    setIsEndDatePickerOpened(false);
  };
  const handeEndDateClear = () => {
    setEndDate(null);
    setIsEndDatePickerOpened(false);
  };

  const validate = (): {
    freq: Frequency;
    startDate: Date;
    endDate: Date | null;
    measurments: {
      index: number;
      offset: number | null;
      groupId: number | null;
    }[];
  } | null => {
    let isDataValid = true;

    if (!freqRef.current) {
      isDataValid = false;
      setFreqError(true);
    } else {
      setFreqError(false);
    }

    if (!startDate) {
      isDataValid = false;
      setStartDateError(true);
    } else {
      setStartDateError(false);
    }

    if (!(endDate === null || (startDate && endDate && startDate < endDate))) {
      isDataValid = false;
    } else {
      isDataValid = true;
    }

    const measurments = Array.from(
      groupsRef.current.entries(),
      ([index, groupIdx]) => {
        const groupId = groupIdx === null ? null : groups[groupIdx].dbId;
        return { index, offset: null, groupId };
      },
    );

    const existingAssessemtnSchedulesWithinDate =
      existingAssessmentSchedules.filter(
        (ea) =>
          !(
            (endDate !== null && endDate <= ea.startDate) ||
            (startDate !== null &&
              ea.endDate !== null &&
              ea.endDate <= startDate)
          ),
      );
    const existingUnscheduledMeasurmentRecordsWithinDate =
      existingUnscheduledMeasurmentRecords.filter(
        (mr) =>
          startDate !== null &&
          startDate <= mr.date &&
          (endDate === null || mr.date < endDate),
      );
    const newGroupsErros = measurments.map(
      ({ groupId }) =>
        existingAssessemtnSchedulesWithinDate.some((as) =>
          as.measurments.some((m) => m.groupId === groupId),
        ) ||
        existingUnscheduledMeasurmentRecordsWithinDate.some(
          (mr) => mr.groupId === groupId,
        ),
    );
    if (newGroupsErros.some(Boolean)) {
      isDataValid = false;
    }
    setGroupsErrors(newGroupsErros);

    if (isDataValid && freqRef.current && startDate) {
      return {
        freq: freqRef.current,
        startDate,
        endDate,
        measurments,
      };
    }
    return null;
  };

  const handleSave = async () => {
    const validatedData = validate();

    if (!validatedData) {
      return;
    }

    if (assessment && assessment.dbId) {
      await dbInsertAssessmentSchedule(db, assessment.dbId, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        measurments: validatedData.measurments,
      });
      navigation.popToTop();
    } else if (assessment) {
      await dbInsertAssessmentScheduleWithAssessment(db, assessment, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        measurments: validatedData.measurments,
      });
      navigation.popToTop();
    } else {
      throw Error("Medicine has not been provided");
    }
  };

  const handleFrequencyPicker = (item: FrequencySelection | null) => {
    if (!item) {
      freqRef.current = null;
      setFreq(null);
      return;
    }
    setFreq(item);
    const freq = frequencySelectionMap[item];
    freqRef.current = freq;
    if (freq.numberOfDoses !== nMeasurments) {
      setNMeasurments(freq.numberOfDoses);
      updateGroupsRefWithDefaults();
    }
  };

  const createGroupInputHandler = (idx: number) => {
    return (groupIdx: number) => {
      groupsRef.current[idx] = groupIdx === -1 ? null : groupIdx;
    };
  };

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.rowContainer, { marginBottom: 20 }]}>
          <ModalPicker
            values={Object.values(FrequencySelection)}
            selectedValue={freq}
            onValueChange={handleFrequencyPicker}
            getLabel={frequencySelectionToDisplayForm}
            placeholder="Select frequency"
            pressableStyle={styles.fullWidthPickerContainer}
            error={freqError}
          />
        </View>

        <View style={[styles.rowMeasurmentsHeader]}>
          <View style={styles.measurmentHeaderContainer}>
            <Text
              style={[
                styles.measurmentHeaderLabel,
                { color: theme.colors.text },
              ]}
            >
              {t("Measurment")}
            </Text>
          </View>
          <View style={styles.measurmentHeaderContainer}>
            <Text
              style={[
                styles.measurmentHeaderLabel,
                { color: theme.colors.text },
              ]}
            >
              {t("Group (optional)")}
            </Text>
          </View>
        </View>

        <View style={styles.measurmentsContainer}>
          {Array.from({ length: nMeasurments }, (_, idx) => (
            <View key={idx} style={styles.rowMeasurment}>
              <View style={styles.measurmentOrdinalContainer}>
                <Text
                  style={[
                    styles.measurmentHeaderLabel,
                    { color: theme.colors.text },
                  ]}
                >
                  {t(`number_ordinal_${idx + 1}`)}
                </Text>
              </View>
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <DropdownPicker
                  options={[-1].concat(
                    Array.from({ length: groups.length }, (_, i) => i),
                  )}
                  initialValue={defaultGroups.get(idx) ?? -1}
                  onValueChange={createGroupInputHandler(idx)}
                  getLabel={(gIdx) =>
                    gIdx === -1 ? "None" : groups[gIdx].name
                  }
                  placeholder="group"
                  pressableStyle={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                  error={groupsErrors[idx]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.rowContainer}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Start date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectStartDate}
            style={[
              styles.dateButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              startDateError && {
                borderColor: theme.colors.error,
                borderWidth: 2,
              },
            ]}
          >
            <Text style={[styles.inputText, { color: theme.colors.text }]}>
              {startDate ? startDate.toDateString() : t("Select date")}
            </Text>
          </TouchableOpacity>
        </View>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={startDate ?? new Date()}
            onValueChange={handleStartDateChange}
            onDismiss={handleStartDateDismiss}
            neutralButton={{ label: "Clear", textColor: "" }}
            onNeutralButtonPress={handleStartDateClear}
          />
        ) : (
          ""
        )}

        <View style={styles.rowContainer}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("End date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectEndDate}
            style={[
              styles.dateButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.inputText, { color: theme.colors.text }]}>
              {endDate ? endDate.toDateString() : t("Infinitely")}
            </Text>
          </TouchableOpacity>
        </View>

        {isEndDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={endDate ?? new Date()}
            minimumDate={startDate ? startDate : undefined}
            onValueChange={handleEndDateChange}
            onDismiss={handeEndDateDismiss}
            neutralButton={{ label: "Clear", textColor: "" }}
            onNeutralButtonPress={handeEndDateClear}
          />
        ) : (
          ""
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
  },
  measurmentsContainer: {
    marginBottom: 30,
  },
  rowMeasurmentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  rowMeasurment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
  },
  measurmentHeaderLabel: {
    fontSize: 16,
  },
  measurmentHeaderContainer: {
    width: "45%",
    justifyContent: "center",
    alignItems: "center",
  },
  measurmentOrdinalContainer: {
    width: "45%",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "400",
    width: "45%",
  },
  dateButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    width: "45%",
  },
  inputText: {
    fontSize: 16,
  },
  fullWidthPickerContainer: {
    height: 55,
    justifyContent: "center",
    width: "100%",
  },
  pickerContainer: {
    justifyContent: "center",
    width: "45%",
    overflow: "hidden",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    zIndex: 1,
  },
  nextButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
