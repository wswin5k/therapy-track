import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  dbGetGroups,
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
import { AssessmentValue } from "../../models/Records";
import {
  AssessmentInput,
  getDefaultValue,
  isTextValueValid,
} from "../../components/AssessmentInput";
import { AssessmentType } from "../../models/AssessmentSchedule";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

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

  const [assessment, setAssessment] = React.useState<AssessmentParam | null>(
    null,
  );
  const [groups, setGroups] = React.useState<Group[]>([]);

  React.useEffect(() => {
    if (assessment) {
      setValue(getDefaultValue(assessment.type));
    }
  }, [assessment]);

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          assessment: AssessmentParam;
          selectedDate?: string;
        };
        setAssessment(params.assessment);
        if (params.selectedDate) {
          setDate(new Date(params.selectedDate));
        } else {
          setDate(new Date());
        }
        const groups = await dbGetGroups(db);
        setGroups(groups);
      };
      setData();
    }, [db, route.params]),
  );

  const handleSelectDate = () => {
    setIsDatePickerOpened(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setIsDatePickerOpened(false);
    if (event.type === "dismissed") {
      setDate(null);
    } else if (newDate) {
      setDate(newDate);
      setDateError(false);
    }
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
            return { date, assessment, value };
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
            />
          </View>
        </View>

        {isDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={date ?? new Date()}
            onChange={handleDateChange}
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
