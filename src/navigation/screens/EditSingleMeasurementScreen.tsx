import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
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
  sortArrayMeasurmentValue,
  UnscheduledMeasurmentRecord,
} from "../../models/Records";
import {
  AssessmentInput,
  getDefaultValue,
  isTextValueValid,
} from "../../components/AssessmentInput";
import { AssessmentSchedule, ValueType } from "../../models/AssessmentSchedule";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  deserializeDateOnly,
  getTodayDateOnly,
  isEqualDateOnly,
  toDisplayConcise,
} from "../../dateOnlyUtils";
import { eStyles } from "../../commonStyles";
import { ERROR_BORDER_WIDTH } from "../commonConsts";

type EditSingleMeasurementScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditSingleMeasurementScreen"
>;

export function EditSingleMeasurementScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<EditSingleMeasurementScreenNavigationProp>();
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
    existingUnscheduledMeasurementRecords,
    setExistingUnscheduledMeasurementRecords,
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
        if (value !== null) {
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
            const existingUnscheduledMeasurementRecordsWithinDate =
              existingUnscheduledMeasurementRecords.filter(
                (mr) => date !== null && isEqualDateOnly(date, mr.date),
              );
            if (
              !existingAssessemtnSchedulesWithinDate.some((as) =>
                as.measurments.some((m) => m.groupId === groupId),
              ) &&
              !existingUnscheduledMeasurementRecordsWithinDate.some(
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

    sortArrayMeasurmentValue(
      dataValidated.value,
      dataValidated.assessment.valueDomain,
    );
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
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        {assessment ? (
          [ValueType.Boolean, ValueType.Numeric].includes(assessment.type) ? (
            <View style={[styles.oneRowAssessmentContainer]}>
              <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                {assessment?.name}
              </Text>
              <View style={[styles.halfAssessmentInputContainer]}>
                <AssessmentInput
                  type={assessment?.type}
                  valueDomain={assessment?.valueDomain}
                  value={value}
                  handleValueChange={setValue}
                  valueError={valueError}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.twoRowAssessmentContainer]}>
              <View style={[styles.rowAssessmentHeader]}>
                <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                  {assessment?.name}
                </Text>
              </View>

              <AssessmentInput
                type={assessment?.type}
                valueDomain={assessment?.valueDomain}
                value={value}
                handleValueChange={setValue}
                valueError={valueError}
              />
            </View>
          )
        ) : (
          <Text>Assessment not set</Text>
        )}

        <View style={[styles.rowDate]}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectDate}
            style={[
              eStyles.datePressable,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              dateError && {
                borderColor: theme.colors.error,
                borderWidth: ERROR_BORDER_WIDTH,
              },
            ]}
          >
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
              {date
                ? toDisplayConcise(date, i18n.resolvedLanguage)
                : "Select date"}
            </Text>
          </TouchableOpacity>
        </View>

        {isDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={date ?? getTodayDateOnly()}
            onValueChange={handleDateChange}
            onDismiss={handleDateDismiss}
            maximumDate={getTodayDateOnly()}
          />
        ) : (
          ""
        )}

        <View style={[styles.rowGroup]}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Group")}
          </Text>

          <View style={[styles.pickerContainer]}>
            <DropdownPicker
              options={[-1].concat(
                Array.from({ length: groups.length }, (_, i) => i),
              )}
              initialValue={-1}
              onValueChange={handleGroupChange}
              getLabel={(idx) => (idx === -1 ? "None" : groups[idx].name)}
              placeholder="group"
              pressableStyle={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
              error={groupError}
            />
          </View>
        </View>
      </ScrollView>
      <View style={[eStyles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            eStyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={eStyles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  oneRowAssessmentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  halfAssessmentInputContainer: {
    width: "50%",
  },
  twoRowAssessmentContainer: {
    minHeight: 120,
    maxHeight: "56%",
    flexDirection: "column",
    marginBottom: 18,
  },
  rowAssessmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rowDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rowGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  pickerContainer: {
    justifyContent: "center",
    width: "50%",
    overflow: "hidden",
  },
});
