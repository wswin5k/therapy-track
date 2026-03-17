import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React from "react";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import {
  dbGetGroups,
  dbInsertAssessment,
  dbInsertUnscheduledAssessmentRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { AssessmentParam } from "..";
import { Group } from "../../models/Frequency";
import { DropdownPicker } from "../../components/DropdownPicker";
import { AssessmentType } from "../../models/AssessmentSchedule";
import { Checkbox } from "react-native-paper";
import { AssessmentValueType } from "../../models/Records";

export function EditSingleMeasurmentScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const db = useSQLiteContext();

  const [date, setDate] = React.useState<Date | null>(null);
  const [dateError, setDateError] = React.useState<boolean>(false);
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);
  const [value, setValue] = React.useState<AssessmentValueType | null>(null);
  const [valueError, setValueError] = React.useState<boolean>(false);
  const groupIdxRef = React.useRef<number | null>(null);

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
    value: AssessmentValueType;
  } | null => {
    if (date) {
      if (assessment) {
        if (value) {
          return { date: date, assessment, value };
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

    await dbInsertUnscheduledAssessmentRecord(db, {
      date: dataValidated.date,
      assessmentId: assessmentId,
      value: dataValidated.value,
      group:
        groupIdxRef.current !== null ? groups[groupIdxRef.current].dbId : null,
    });

    navigation.navigate("HomeTabs");
  };

  const handleValueChange = (value: AssessmentValueType) => {
    setValue(value);
  };

  const handleGroupChange = (groupIdx: number) => {
    groupIdxRef.current = groupIdx === -1 ? null : groupIdx;
  };

  const renderNumericInput = () => {
    return (
      <View style={[styles.rowContainer]}>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {"Value"}
        </Text>
        <View style={styles.doseContainer}>
          <SmallNumberStepper onChange={handleValueChange} />
        </View>
      </View>
    );
  };

  const renderBooleanInput = () => {
    return (
      <View style={[styles.rowContainer]}>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {"Value"}
        </Text>
        <View style={styles.doseContainer}>
          <Checkbox status="unchecked" onPress={() => {}} />
        </View>
      </View>
    );
  };

  let renderInput = () => (
    <View>
      <Text>Wrong assessment type</Text>
    </View>
  );

  switch (assessment?.type) {
    case AssessmentType.Numeric:
      renderInput = renderNumericInput;
    case AssessmentType.Boolean:
      renderInput = renderBooleanInput;
  }

  return (
    <DefaultMainContainer>
      <View style={[styles.mainContainer]}>
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
                borderColor: theme.colors.border,
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

        {renderInput()}

        {isDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={date ?? new Date()}
            onChange={handleDateChange}
          />
        ) : (
          ""
        )}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.nextButtonText}>{t("Save")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  doseContainer: {
    width: "45%",
    height: 52,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "400",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
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
    borderRadius: 8,
    justifyContent: "center",
    borderWidth: 1,
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
