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
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Group } from "../../../models/Frequency";
import { Frequency, FrequencySelection } from "../../../models/Frequency";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { AssessmentParam } from "../..";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetGroups,
  dbInsertAssessmentSchedule,
  dbInsertAssessmentScheduleWithMedicine,
} from "../../../models/dbAccess";
import { DefaultMainContainer } from "../../../components/DefaultMainContainer";
import { DropdownPicker } from "../../../components/DropdownPicker";
import { frequencySelectionToDisplayForm } from "../../enumMappings";
import { ModalPicker } from "../../../components/ModalPicker";
import { assingDefaultGroups, frequencySelectionMap } from "./common";

export default function EditAssessmentScheduleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
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

  const updateGroupsRefWithDefaults = React.useCallback(
    (nDoses: number) => {
      const defaultGroups = assingDefaultGroups(groups);
      for (let i = 0; i < nDoses; i++) {
        groupsRef.current[i] = defaultGroups.get(i) ?? null;
      }
    },
    [groups],
  );

  useFocusEffect(
    React.useCallback(
      () => updateGroupsRefWithDefaults(nMeasurments),
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

        const groups = await dbGetGroups(db);
        setGroups(groups);
        setDefaultGroups(assingDefaultGroups(groups));
      };
      setData();
    }, [db, route.params]),
  );

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setStartDate(null);
    } else if (date) {
      setStartDate(date);
      setStartDateError(false);
    }
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setEndDate(null);
    } else if (date) {
      setEndDate(date);
    }
    setIsEndDatePickerOpened(false);
  };

  const validate = (): {
    freq: Frequency;
    startDate: Date;
    endDate: Date | null;
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

    if (isDataValid && freqRef.current && startDate) {
      return {
        freq: freqRef.current,
        startDate,
        endDate,
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
      });
      navigation.navigate("HomeTabs");
    } else if (assessment) {
      await dbInsertAssessmentScheduleWithMedicine(db, assessment, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
      });
      navigation.navigate("HomeTabs");
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
      updateGroupsRefWithDefaults(freq.numberOfDoses);
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
            value={new Date()}
            onChange={handleStartDateChange}
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
            value={new Date()}
            minimumDate={startDate ? startDate : undefined}
            onChange={handleEndDateChange}
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
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    width: "100%",
  },
  pickerContainer: {
    height: 52,
    borderRadius: 8,
    justifyContent: "center",
    borderWidth: 1,
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
