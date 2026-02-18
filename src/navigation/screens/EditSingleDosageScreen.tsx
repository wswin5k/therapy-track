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
import { ActiveIngredient, BaseUnit, Medicine } from "../../models/Medicine";
import { MedicineParam, RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";
import { Group } from "../../models/Schedule";

type EditSingeDosageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditSingleDosageScreen"
>;

export function EditSingleDosageScreen() {
  const { t, i18n } = useTranslation();
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
        setMedicine(
          (
            route.params as {
              medicine: MedicineParam;
            }
          ).medicine,
        );
        const groups = await dbGetGroups(db);
        setGroups(groups);
      };
      setData();
    }, []),
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
      group: groupIdxRef.current ? groups[groupIdxRef.current].dbId : null,
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
      <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
        {t("Dose")}
      </Text>
      <View style={styles.doseContainer}>
        <SmallNumberStepper onChange={handleDoseChange} />
      </View>
      <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
        {t("Date")}
      </Text>
      <TouchableOpacity
        onPress={handleSelectDate}
        style={[
          styles.input,
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

      <Picker
        style={[
          styles.picker,
          { borderWidth: 2, width: 200, color: theme.colors.text },
        ]}
        selectedValue={-1}
        dropdownIconColor={theme.colors.text}
        onValueChange={handleGroupChange}
      >
        <Picker.Item
          key={-1}
          label={t("None")}
          value={-1}
          style={styles.pickerItem}
          color={theme.colors.textTertiary}
        />
        {groups.map((g, gIdx) => (
          <Picker.Item
            key={gIdx}
            label={t(g.name)}
            value={gIdx}
            style={styles.pickerItem}
            color={theme.colors.text}
          />
        ))}
      </Picker>

      {isDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={new Date()}
          onChange={handleDateChange}
        />
      ) : (
        ""
      )}
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
    padding: 16,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  doseContainer: {},
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 10,
  },
  inputError: {
    borderWidth: 2,
  },
  inputText: {
    fontSize: 16,
  },
  fullWidthPickerContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 15,
  },
  picker: {
    width: "100%",
    height: 50,
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
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
});
