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
import { Group } from "../../models/Frequency";
import { DropdownPicker } from "../../components/DropdownPicker";
import { baseUnitToDoseHeader } from "../enumMappings";
import {
  deserializeDateOnly,
  getTodayDateOnly,
  toDisplayConcise,
} from "../../dateOnlyUtils";
import { eStyles } from "../../commonStyles";
import { ERROR_BORDER_WIDTH } from "../commonConsts";

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
  const [amount, setAmount] = React.useState<number>(1);
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
          setDate(deserializeDateOnly(params.selectedDate));
        } else {
          setDate(getTodayDateOnly());
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
    medicine: MedicineParam;
    dosageAmount: number;
  } | null => {
    if (date) {
      if (medicine) {
        return { date: date, medicine: medicine, dosageAmount: amount };
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
      dosageAmount: dataValidated.dosageAmount,
      group:
        groupIdxRef.current !== null ? groups[groupIdxRef.current].dbId : null,
    });

    navigation.popToTop();
  };

  const handleAmountChange = (value: number) => {
    setAmount(value);
  };

  const handleGroupChange = (groupIdx: number) => {
    groupIdxRef.current = groupIdx === -1 ? null : groupIdx;
  };

  const doseHeader = medicine
    ? baseUnitToDoseHeader(medicine.baseUnit)
    : "Dose";

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowContainer]}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {doseHeader}
          </Text>
          <View style={styles.dosageContainer}>
            <SmallNumberStepper onChange={handleAmountChange} />
          </View>
        </View>

        <View style={[styles.rowContainer]}>
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

        <View style={[styles.rowContainer]}>
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
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  dosageContainer: {
    width: "50%",
  },
  pickerContainer: {
    justifyContent: "center",
    width: "50%",
    overflow: "hidden",
  },
});
