import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import RNDateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  dbGetAssessmentSchedules,
  dbGetGroups,
  dbGetUnscheduledMeasurmentRecords,
  dbInsertAssessment,
  dbInsertUnscheduledMeasurmentRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { AssessmentParam, RootStackParamList } from "..";
import { Group } from "../../models/Frequency";
import { DropdownPicker } from "../../components/DropdownPicker";
import {
  AssessmentValue,
  UnscheduledMeasurmentRecord,
} from "../../models/Records";
import {
  AssessmentInput,
  getDefaultValue,
  isTextValueValid,
} from "../../components/AssessmentInput";
import {
  AssessmentSchedule,
  AssessmentType,
} from "../../models/AssessmentSchedule";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  deserializeDateOnly,
  getTodayDateOnly,
  isEqualDateOnly,
} from "../../dateOnlyUtils";

type EditSingleMeasurmentScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditSingleMeasurmentScreen"
>;

export function EditSingleMeasurmentScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<EditSingleMeasurmentScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const [date, setDate] = React.useState<Date | null>(null);
  const [dateError, setDateError] = React.useState<boolean>(false);
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);
  const [value, setValue] = React.useState<AssessmentValue | null>(null);
  const [valueError, setValueError] = React.useState<boolean>(false);
  const groupIdxRef = React.useRef<number | null>(null);

  const [groupError, setGroupError] = React.useState<boolean>(false);
  const [existingAssessmentSchedules, setExistingAssessmentSchedules] =
    React.useState<AssessmentSchedule[]>([]);
  const [
    existingUnscheduledMeasurmentRecords,
    setExistingUnscheduledMeasurmentRecords,
  ] = React.useState<UnscheduledMeasurmentRecord[]>([]);

  const [assessment, setAssessment] = React.useState<AssessmentParam | null>(
    null,
  );
  const [groups, setGroups] = React.useState<Group[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          assessment: AssessmentParam;
          selectedDate?: string;
        };
        setAssessment(params.assessment);
        setValue(getDefaultValue(params.assessment.type));
        if (params.selectedDate) {
          setDate(deserializeDateOnly(params.selectedDate));
        } else {
          setDate(getTodayDateOnly());
        }
        const groups = await dbGetGroups(db);
        setGroups(groups);

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

  const handleSelectDate = () => {
    setIsDatePickerOpened(true);
  };

  const handleDateChange = (_: DateTimePickerChangeEvent, newDate?: Date) => {
    if (newDate) {
      setDate(newDate);
      setDateError(false);
    }
    setIsDatePickerOpened(false);
  };
  const handleDateDismiss = () => {
    setIsDatePickerOpened(false);
  };

  const validate = (): {
    date: Date;
    assessment: AssessmentParam;
    value: AssessmentValue;
  } | null => {
    if (date) {
      if (assessment) {
        if (value) {
          if (!isTextValueValid(value, assessment.valueDomain)) {
            const groupId =
              groupIdxRef.current === null
                ? null
                : groups[groupIdxRef.current].dbId;

            const existingAssessemtnSchedulesWithinDate =
              existingAssessmentSchedules.filter(
                (ea) =>
                  date &&
                  ea.startDate <= date &&
                  (ea.endDate === null || date <= ea.endDate),
              );
            const existingUnscheduledMeasurmentRecordsWithinDate =
              existingUnscheduledMeasurmentRecords.filter(
                (mr) => date !== null && isEqualDateOnly(date, mr.date),
              );
            if (
              !existingAssessemtnSchedulesWithinDate.some((as) =>
                as.measurments.some((m) => m.groupId === groupId),
              ) &&
              !existingUnscheduledMeasurmentRecordsWithinDate.some(
                (mr) => mr.groupId === groupId,
              )
            ) {
              return { date, assessment, value };
            } else {
              setGroupError(true);
            }
          } else {
            setValueError(true);
          }
        } else {
          setValueError(true);
        }
      } else {
        throw Error("Assessment has not been set");
      }
    } else {
      setDateError(true);
    }
    return null;
  };

  const handleSave = async () => {
    const dataValidated = validate();
    if (!dataValidated) {
      return;
    }

    const assessmentId =
      dataValidated.assessment.dbId ??
      (await dbInsertAssessment(db, dataValidated.assessment));

    await dbInsertUnscheduledMeasurmentRecord(db, {
      date: dataValidated.date,
      assessmentId: assessmentId,
      value: dataValidated.value,
      group:
        groupIdxRef.current !== null ? groups[groupIdxRef.current].dbId : null,
    });

    navigation.popToTop();
  };

  const handleGroupChange = (groupIdx: number) => {
    groupIdxRef.current = groupIdx === -1 ? null : groupIdx;
  };

  return (
    <DefaultMainContainer>
      <View style={styles.scrollContainer}>
        {assessment ? (
          [AssessmentType.Boolean, AssessmentType.Numeric].includes(
            assessment.type,
          ) ? (
            <View style={[styles.rowContainer]}>
              <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
                {"Value"}
              </Text>
              <AssessmentInput
                type={assessment?.type}
                valueDomain={assessment?.valueDomain}
                value={value}
                handleValueChange={setValue}
                valueError={valueError}
              />
            </View>
          ) : (
            <>
              <Text
                style={[styles.soleHeaderLabel, { color: theme.colors.text }]}
              >
                {"Value"}
              </Text>
              <View style={[styles.soleAssessmentInputContainer]}>
                <AssessmentInput
                  type={assessment?.type}
                  valueDomain={assessment?.valueDomain}
                  value={value}
                  handleValueChange={setValue}
                  valueError={valueError}
                />
              </View>
            </>
          )
        ) : (
          <Text>Assessment not set</Text>
        )}

        <View style={[styles.rowContainer]}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectDate}
            style={[
              styles.dateButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              dateError && { borderColor: theme.colors.error, borderWidth: 2 },
            ]}
          >
            <Text style={[styles.inputText, { color: theme.colors.text }]}>
              {date ? date.toDateString() : "Select date"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.rowContainer]}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Group (optional)")}
          </Text>

          <View
            style={[
              styles.pickerContainer,
              {
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <DropdownPicker
              options={[-1].concat(
                Array.from({ length: groups.length }, (_, i) => i),
              )}
              initialValue={-1}
              onValueChange={handleGroupChange}
              getLabel={(idx) => (idx === -1 ? "None" : groups[idx].name)}
              placeholder="group"
              pressableStyle={{
                ...styles.picker,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
              error={groupError}
            />
          </View>
        </View>

        {isDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={date ?? new Date()}
            onValueChange={handleDateChange}
            onDismiss={handleDateDismiss}
            maximumDate={getTodayDateOnly()}
          />
        ) : (
          ""
        )}
      </View>
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
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
    paddingBottom: 110,
  },
  valueInputContainer: {
    width: "45%",
    height: 52,
  },
  textInput: {
    borderWidth: 1,
    fontSize: 16,
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "400",
  },
  soleHeaderLabel: {
    fontSize: 18,
    fontWeight: "400",
    width: "100%",
    textAlign: "left",
    paddingLeft: 10,
    marginTop: 15,
    marginLeft: 15,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    margin: 15,
    paddingLeft: 10,
  },
  soleAssessmentInputContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    maxHeight: "50%",
    margin: 15,
    paddingLeft: 10,
  },
  dateButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    width: "45%",
  },
  dateError: {
    borderWidth: 2,
  },
  inputText: {
    fontSize: 16,
  },
  pickerContainer: {
    height: 52,
    justifyContent: "center",
    width: "45%",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 50,
    borderWidth: 1,
  },
  pickerItem: {
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
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
