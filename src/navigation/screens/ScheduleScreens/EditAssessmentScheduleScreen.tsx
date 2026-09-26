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
import { Group, IntervalUnit } from "../../../models/Frequency";
import { Frequency } from "../../../models/Frequency";
import { FrequencySelection } from "./common";
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
import { ModalPicker } from "../../../components/ModalPicker";
import { assingDefaultGroups, frequencySelectionMap } from "./common";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AssessmentSchedule } from "../../../models/AssessmentSchedule";
import { UnscheduledMeasurmentRecord } from "../../../models/Records";
import { ERROR_BORDER_WIDTH } from "../../commonConsts";
import { getTodayDateOnly, toDisplayConcise } from "../../../dateOnlyUtils";
import { eStyles, EDIT_PRESSABLE_HEIGHT } from "../../../commonStyles";

type EditAssessmentScheduleScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditAssessmentScheduleScreen"
>;

export default function EditAssessmentScheduleScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation =
    useNavigation<EditAssessmentScheduleScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const [freqSelection, setFreqSelection] =
    React.useState<FrequencySelection | null>(null);
  const freqRef = React.useRef<Frequency | null>(null);
  const [customFreqLabel, setCustomFreqLabel] = React.useState<string | null>(
    null,
  );
  const [freqSelectionError, setFreqSelectionError] =
    React.useState<boolean>(false);

  const [nMeasurements, setNMeasurements] = React.useState<number>(1);
  const measurementIdxToGroupId = React.useRef<(number | null)[]>(
    Array.from({ length: nMeasurements }, () => null),
  );
  // offsets for the measurment
  // value other than one is used only
  // with "specific weekdays" custom frequency
  // the measurments will be cartesian-multiplied with it
  const offsetsMultiplier = React.useRef<number[]>([0]);

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

  const [groupsMap, setGroupsMap] = React.useState<Map<number, Group>>(
    new Map(),
  );
  const [measurementIdxToDefaultGroupId, setMeasurementIdxToDefaultGroupIdx] =
    React.useState<Map<number, number>>(new Map());
  const groupsIds = React.useMemo(
    () => [-1, ...Array.from(groupsMap.values()).map((g) => g.dbId)],
    [groupsMap],
  );
  const [groupsErrors, setGroupsErrors] = React.useState<boolean[]>([]);

  const [existingAssessmentSchedules, setExistingAssessmentSchedules] =
    React.useState<AssessmentSchedule[]>([]);
  const [
    existingUnscheduledMeasurementRecords,
    setExistingUnscheduledMeasurementRecords,
  ] = React.useState<UnscheduledMeasurmentRecord[]>([]);

  const updateGroupsRefWithDefaults = React.useCallback(() => {
    measurementIdxToGroupId.current = Array.from(
      { length: nMeasurements },
      (_, idx) => measurementIdxToDefaultGroupId.get(idx) ?? null,
    );
  }, [measurementIdxToDefaultGroupId, nMeasurements]);

  const frequencySelectionToPickerLabels =
    (specialCustomLabel: boolean) => (key: FrequencySelection) => {
      const mapping = {
        OnceDaily: "Once daily",
        TwiceDaily: "Twice daily",
        ThriceDaily: "Three times daily",
        OnceWeekly: "Weekly",
        OnceBiweekly: "Every two weeks",
        Custom: "Custom...",
      };
      if (
        specialCustomLabel &&
        key === FrequencySelection.Custom &&
        customFreqLabel
      ) {
        return customFreqLabel;
      }
      return mapping[key];
    };
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
          customFrequency?: {
            freq: Frequency;
            doesurementOffsets: number[];
            label: string;
          };
        };
        setAssessment(params.assessment);

        if (params.customFrequency) {
          freqRef.current = params.customFrequency?.freq ?? null;
          const freq = params.customFrequency.freq;
          if (
            freq.intervalUnit === IntervalUnit.week &&
            freq.intervalLength === 1
          ) {
            setNMeasurements(1);
            offsetsMultiplier.current =
              params.customFrequency.doesurementOffsets;
          } else {
            setNMeasurements(freq.numberOfDosages);
          }
          setCustomFreqLabel(
            params.customFrequency
              ? `Custom: ` + params.customFrequency?.label
              : null,
          );
          navigation.setParams({ customFrequency: undefined });
          updateGroupsRefWithDefaults();
        }

        const groups = await dbGetGroups(db);
        const newGroupsMap = new Map();
        groups.forEach((g) => newGroupsMap.set(g.dbId, g));
        setGroupsMap(newGroupsMap);
        setMeasurementIdxToDefaultGroupIdx(assingDefaultGroups(groups));
        setGroupsErrors(Array.from({ length: nMeasurements }, () => false));

        const newExistingAssessmentSchedules = (
          await dbGetAssessmentSchedules(db)
        ).filter(
          (a) =>
            params.assessment.dbId !== undefined &&
            a.assessment.dbId === params.assessment.dbId,
        );
        setExistingAssessmentSchedules(newExistingAssessmentSchedules);

        const newExistingUnscheduledMeasurementRecords = (
          await dbGetUnscheduledMeasurmentRecords(db)
        ).filter(
          (a) =>
            params.assessment.dbId !== undefined &&
            a.assessmentId === params.assessment.dbId,
        );
        setExistingUnscheduledMeasurementRecords(
          newExistingUnscheduledMeasurementRecords,
        );
      };
      setData();
    }, [
      db,
      route.params,
      nMeasurements,
      navigation,
      updateGroupsRefWithDefaults,
    ]),
  );

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };
  const handleStartDateChange = (_: DateTimePickerChangeEvent, date?: Date) => {
    if (date) {
      setStartDate(date);
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
      setEndDate(date);
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
    measurements: {
      index: number;
      offset: number | null;
      groupId: number | null;
    }[];
  } | null => {
    let isDataValid = true;

    if (!freqRef.current) {
      isDataValid = false;
      setFreqSelectionError(true);
    } else {
      setFreqSelectionError(false);
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

    let measurements = [];
    for (const [mIdx, m] of measurementIdxToGroupId.current.entries()) {
      for (const [oIdx, o] of offsetsMultiplier.current.entries()) {
        measurements.push({
          groupId: m,
          index: mIdx * offsetsMultiplier.current.length + oIdx,
          offset: o,
        });
      }
    }

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
    const existingUnscheduledMeasurementRecordsWithinDate =
      existingUnscheduledMeasurementRecords.filter(
        (mr) =>
          startDate !== null &&
          startDate <= mr.date &&
          (endDate === null || mr.date < endDate),
      );
    const newGroupsErros = measurements.map(
      ({ groupId }) =>
        existingAssessemtnSchedulesWithinDate.some((as) =>
          as.measurments.some((m) => m.groupId === groupId),
        ) ||
        existingUnscheduledMeasurementRecordsWithinDate.some(
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
        measurements,
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
        measurments: validatedData.measurements,
      });
      navigation.popToTop();
    } else if (assessment) {
      await dbInsertAssessmentScheduleWithAssessment(db, assessment, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        measurments: validatedData.measurements,
      });
      navigation.popToTop();
    } else {
      throw Error("Medicine has not been provided");
    }
  };

  const handleFrequencyPicker = (item: FrequencySelection | null) => {
    if (!item) {
      freqRef.current = null;
      setFreqSelection(null);
      return;
    }
    if (item === FrequencySelection.Custom) {
      freqRef.current = null;
      setFreqSelection(item);
      navigation.navigate("EditCustomFrequencyScreen");
      return;
    }
    setFreqSelection(item);
    const freq = frequencySelectionMap[item];
    freqRef.current = freq;
    if (freq.numberOfDosages !== nMeasurements) {
      setNMeasurements(freq.numberOfDosages);
      updateGroupsRefWithDefaults();
    }
  };

  const createGroupInputHandler = (idx: number) => {
    return (groupIdx: number) => {
      measurementIdxToGroupId.current[idx] = groupIdx === -1 ? null : groupIdx;
    };
  };

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowFrequencyPicker]}>
          <ModalPicker
            values={Object.values(FrequencySelection)}
            selectedValue={freqSelection}
            onValueChange={handleFrequencyPicker}
            getLabel={frequencySelectionToPickerLabels(false)}
            getPressableLabel={frequencySelectionToPickerLabels(true)}
            placeholder="Select frequency"
            pressableStyle={eStyles.fullWidthPickerPressable}
            error={freqSelectionError}
          />
        </View>

        {nMeasurements > 1 ? (
          <View style={[styles.rowMeasurementsHeaders]}>
            <View style={styles.measurementHeaderContainer}>
              <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                {t("Measurement")}
              </Text>
            </View>
            <View style={styles.measurementHeaderContainer}>
              <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                {t("Group")}
              </Text>
            </View>
          </View>
        ) : (
          ""
        )}

        <View style={styles.measurementsContainer}>
          {Array.from({ length: nMeasurements }, (_, idx) => (
            <View
              // complex key to re-render when there is a change in initialValue
              key={idx * 10 + (measurementIdxToDefaultGroupId.get(idx) ?? -1)}
              style={styles.rowMeasurement}
            >
              {nMeasurements > 1 ? (
                <View style={styles.measurementOrdinalContainer}>
                  <Text
                    style={[
                      styles.measurementText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t(`number_ordinal_${idx + 1}`)}
                  </Text>
                </View>
              ) : (
                <View style={styles.measurementGroupContainer}>
                  <Text
                    style={[eStyles.labelText, { color: theme.colors.text }]}
                  >
                    {t("Group")}
                  </Text>
                </View>
              )}
              <View style={[styles.measurementGroupPickerContainer]}>
                <DropdownPicker
                  options={groupsIds}
                  initialValue={measurementIdxToDefaultGroupId.get(idx) ?? -1}
                  onValueChange={createGroupInputHandler(idx)}
                  getLabel={(gIdx) =>
                    gIdx === -1 ? "None" : (groupsMap.get(gIdx)?.name ?? "")
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

        <View style={styles.rowDate}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Start date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectStartDate}
            style={[
              eStyles.datePressable,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              startDateError && {
                borderColor: theme.colors.error,
                borderWidth: ERROR_BORDER_WIDTH,
              },
            ]}
          >
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
              {startDate
                ? toDisplayConcise(startDate, i18n.resolvedLanguage)
                : t("Select date")}
            </Text>
          </TouchableOpacity>
        </View>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={startDate ?? getTodayDateOnly()}
            onValueChange={handleStartDateChange}
            onDismiss={handleStartDateDismiss}
            neutralButton={{ label: "Clear", textColor: "" }}
            onNeutralButtonPress={handleStartDateClear}
          />
        ) : (
          ""
        )}

        <View style={styles.rowDate}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("End date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectEndDate}
            style={[
              eStyles.datePressable,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
              {endDate
                ? toDisplayConcise(endDate, i18n.resolvedLanguage)
                : t("Infinitely")}
            </Text>
          </TouchableOpacity>
        </View>

        {isEndDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={endDate ?? getTodayDateOnly()}
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
          eStyles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          style={[
            eStyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              eStyles.nextButtonText,
              { color: theme.colors.textOnPrimary },
            ]}
          >
            {t("Save")}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  rowFrequencyPicker: {
    marginBottom: 16,
  },
  measurementsContainer: {
    marginBottom: 24,
  },
  rowMeasurementsHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  rowMeasurement: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: EDIT_PRESSABLE_HEIGHT,
    marginBottom: 6,
  },
  measurementHeaderContainer: {
    width: "45%",
    justifyContent: "center",
    alignItems: "center",
  },
  measurementOrdinalContainer: {
    width: "45%",
    height: EDIT_PRESSABLE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  measurementGroupContainer: {
    width: "45%",
    height: EDIT_PRESSABLE_HEIGHT,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  measurementText: {
    fontSize: 19,
    fontWeight: "400",
  },
  measurementGroupPickerContainer: {
    justifyContent: "center",
    width: "45%",
    overflow: "hidden",
  },
  rowDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
});
