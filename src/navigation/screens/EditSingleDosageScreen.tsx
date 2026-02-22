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
  dbInsertMedicine,
  dbInsertUnscheduledDosageRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { MedicineParam, RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Group } from "../../models/Schedule";
import { DropdownPicker } from "../../components/DropdownPicker";

type EditSingeDosageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditSingleDosageScreen"
>;

export function EditSingleDosageScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<EditSingeDosageScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const [date, setDate] = React.useState<Date | null>(null);
  const [dateError, setDateError] = React.useState<boolean>(false);
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);
  const [dose, setDose] = React.useState<number>(1);
  const groupIdxRef = React.useRef<number | null>(null);

  const [medicine, setMedicine] = React.useState<MedicineParam | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          medicine: MedicineParam;
          selectedDate?: string;
        };
        setMedicine(params.medicine);
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
    medicine: MedicineParam;
    doseAmount: number;
  } | null => {
    if (date) {
      if (medicine) {
        return { date: date, medicine: medicine, doseAmount: dose };
      } else {
        throw Error("Medicine has not been set");
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
    const medicineId =
      dataValidated.medicine.dbId ??
      (await dbInsertMedicine(db, dataValidated.medicine));

    await dbInsertUnscheduledDosageRecord(db, {
      date: dataValidated.date,
      medicineId: medicineId,
      doseAmount: dataValidated.doseAmount,
      group:
        groupIdxRef.current !== null ? groups[groupIdxRef.current].dbId : null,
    });

    navigation.navigate("HomeTabs");
  };

  const handleDoseChange = (value: number) => {
    setDose(value);
  };

  const handleGroupChange = (groupIdx: number) => {
    groupIdxRef.current = groupIdx === -1 ? null : groupIdx;
  };

  return (
    <DefaultMainContainer>
      <View style={[styles.mainContainer]}>
        <View style={[styles.rowContainer]}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Dose")}
          </Text>
          <View style={styles.doseContainer}>
            <SmallNumberStepper onChange={handleDoseChange} />
          </View>
        </View>

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
