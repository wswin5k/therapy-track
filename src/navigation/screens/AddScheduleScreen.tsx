import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Button } from "@react-navigation/elements";
import RNDateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

class Amount {
  value: number = 0;
  unit: string = "";
  // weight: mg, g, ...?
  // piece: pill, pen, syringe
}

class MedicineEntry {
  brandName: string;
  genericName: string;
  doseWeight: Amount;
  dosePiece: Amount;

  constructor(
    brandName: string,
    genericName: string,
    doseWeight: Amount,
    dosePiece: Amount,
  ) {
    this.brandName = brandName;
    this.genericName = genericName;
    this.doseWeight = doseWeight;
    this.dosePiece = dosePiece;
  }
}

class Schedule {
  dateStart: Date;
  dateEnd: Date;
  medicineEntry: MedicineEntry;

  constructor(dateStart: Date, dateEnd: Date, medicineEntry: MedicineEntry) {
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.medicineEntry = medicineEntry;
  }
}

enum BaseUnit {
  Pill = "pill",
  Ml = "ml",
  Teaspoonfull = "teaspoonfull (5ml)",
  Drop = "drop",
  InjectioPen = "injection pen",
  Sachet = "sachet",
  PressOfTheDosingPump = "press of the dosing pump",
  Vial = "vial",
  PreFilledSyringe = "pre-filled syringe",
}
``;

enum IngredientWeight {
  Miligram = "mg",
  Gram = "g",
  Microgram = "µg",
}

enum Frequency {
  OnceDaily = "once daily",
  TwiceDaily = "two times a day",
  OnceWeekly = "one time a week",
}

class ActiveIngedientInfo {
  name: string | null;
  weight: number | null;
  unit: IngredientWeight | null;
  elementKey: number;

  constructor(
    elementKey: number,
    name: string | null = null,
    weight: number | null = null,
    unit: IngredientWeight | null = null,
  ) {
    this.elementKey = elementKey;
    this.name = name;
    this.weight = weight;
    this.unit = unit;
  }
}

// function activeIngredientInfoCapture(): [ActiveIngredientRefs, () => ActiveIngedientInfo]{
//   const refs = React.useRef<ActiveIngredientRefs>(new ActiveIngredientRefs(null, null, null));

//   const refsValueCallback = () => {
//     const name = refs.current.nameRef?.current?.;
//   }

//   return [refs, refsValueCallback]

// }

type ActiveIngedientRowProps = {
  activeIngredientInfo: ActiveIngedientInfo;
  removeCallback: () => void;
  removeButton: boolean;
};

function ActiveIngredientRow({
  activeIngredientInfo,
  removeCallback,
  removeButton,
}: ActiveIngedientRowProps) {
  const [name, setName] = React.useState<string>(
    activeIngredientInfo.name ? activeIngredientInfo.name : "",
  );

  const handleRemove = () => {
    removeCallback();
  };

  return (
    <View style={styles.row}>
      <TextInput
        onChangeText={(text: string) => {
          activeIngredientInfo.name = text;
          setName(text);
        }}
        style={[styles.input, { width: "25%" }]}
        placeholder="Name"
        value={name}
      />
      <TextInput
        onChangeText={(weightStr: string) => {
          activeIngredientInfo.weight = parseFloat(weightStr);
        }}
        style={[styles.input, { width: "25%" }]}
        placeholder="Weight"
        defaultValue={
          activeIngredientInfo.weight
            ? activeIngredientInfo.weight.toString()
            : ""
        }
      />
      <Picker
        onValueChange={(unit: string) => {
          activeIngredientInfo.unit = IngredientWeight.Gram;
        }}
        placeholder="Select unit"
        style={[{ borderWidth: 1, width: "30%" }]}
      >
        {Object.values(IngredientWeight).map((unit) => (
          <Picker.Item label={unit} value={unit} />
        ))}
      </Picker>
      {removeButton ? <Button onPress={handleRemove}>x</Button> : ""}
    </View>
  );
}

function AddMedicineForm() {}

function AddScheduleForm() {}

export function AddScheduleScreen() {
  const { t, i18n } = useTranslation();
  const [isStartDatePickerOpened, setIsStartDatePickerOpened] =
    React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [isEndDatePickerOpened, setIsEndDatePickerOpened] =
    React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  const [nActiveIngredients, setNActiveIngredients] = React.useState<number>(1);
  const elementKeyCounter = React.useRef<number>(nActiveIngredients);
  const activeIngredientsRefs = React.useRef(
    Array.from(
      { length: nActiveIngredients },
      (_, idx) => new ActiveIngedientInfo(idx),
    ),
  );

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
    if (date) {
      setStartDate(date);
    }
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
    if (date) {
      setEndDate(date);
    }
    setIsEndDatePickerOpened(false);
  };

  const handleSave = () => {
    console.log(activeIngredientsRefs.current);
  };

  const handleAddActiveIngredient = () => {
    activeIngredientsRefs.current.push(
      new ActiveIngedientInfo(elementKeyCounter.current),
    );
    elementKeyCounter.current += 1;
    setNActiveIngredients(nActiveIngredients + 1);
  };

  const removeActiveIngredient = (idx: number) => {
    return () => {
      console.log("removing", idx, ": ", activeIngredientsRefs.current[idx]);
      activeIngredientsRefs.current.splice(idx, 1);
      setNActiveIngredients(nActiveIngredients - 1);
    };
  };

  return (
    <SafeAreaView style={styles.mainFlow}>
      <View style={styles.row}>
        {/* <Text>{t($ => $["Brand name"])}</Text> */}
        <TextInput
          placeholder="Name"
          style={[styles.input, { width: "70%" }]}
        ></TextInput>
      </View>

      <View style={[styles.row, { justifyContent: "center" }]}>
        {/* <Text style={[{width: "50%"}, styles.mainFontSize]}>{t($ => $["Base unit"])}</Text> */}
        <Picker style={[{ width: "70%", alignSelf: "center" }]}>
          <Picker.Item label="Select an option" value="" />
          {Object.values(BaseUnit).map((unit) => (
            <Picker.Item
              style={[{ textAlign: "center" }, styles.mainFontSize]}
              label={unit}
              value={unit}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.mainFontSize}>
        {t("Active ingredients per base unit")}
      </Text>
      <View style={styles.mainFlow}>
        {Array.from({ length: nActiveIngredients }, (_, idx) => (
          <ActiveIngredientRow
            key={activeIngredientsRefs.current[idx].elementKey}
            activeIngredientInfo={activeIngredientsRefs.current[idx]}
            removeCallback={removeActiveIngredient(idx)}
            removeButton={nActiveIngredients === 1 ? false : true}
          />
        ))}
        {/* <TextInput style={[styles.input, {width: "25%"}]} placeholder="Name"></TextInput>
        <TextInput style={[styles.input, {width: "25%"}]} placeholder="Weight"></TextInput>
        <Picker placeholder='Select unit' style={[{borderWidth: 1, width: "30%"}]}>
          { Object.values(IngredientWeight).map((unit) => <Picker.Item label={unit} value={unit} />) }
        </Picker> */}
      </View>
      <Button onPress={handleAddActiveIngredient}> + </Button>
      <Text>Schedule</Text>

      <View style={styles.row}>
        <Text>{t("Frequency")}</Text>
        <Picker style={[{ width: "50%" }]}>
          {Object.values(Frequency).map((unit) => (
            <Picker.Item label={unit} value={unit} />
          ))}
        </Picker>
      </View>

      <Text>Dose</Text>

      <Text>Start date</Text>
      <Button onPress={handleSelectStartDate}>
        {startDate ? startDate.toDateString() : "Select date"}
      </Button>
      {isStartDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={new Date()}
          onChange={handleStartDateChange}
        />
      ) : (
        ""
      )}

      <Text>End date</Text>
      <Button onPress={handleSelectEndDate}>
        {endDate ? endDate.toDateString() : "Select date"}
      </Button>
      {isEndDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={new Date()}
          onChange={handleEndDateChange}
        />
      ) : (
        ""
      )}

      <Text>That's 2 weeks</Text>

      <Button onPress={handleSave}>Next</Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainFlow: {
    flexDirection: "column",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 10,
  },
  mainFontSize: {
    fontSize: 20,
  },
  input: {
    fontSize: 20,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 7,
  },
});
