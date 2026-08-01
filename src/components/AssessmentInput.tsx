import {
  AssessmentType,
  NumericValueDomain,
  SelectValueDomain,
  TextValueDomain,
  ValueDomain,
} from "../models/AssessmentSchedule";
import { AssessmentValue } from "../models/Records";
import SmallNumberStepper from "./SmallNumberStepper";
import { ERROR_BORDER_WIDTH } from "../navigation/commonConsts";
import { useTheme } from "@react-navigation/native";
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  ScrollView,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { TEXT_MAX_LENGTH } from "../navigation/screens/EditAssessmentScreen";

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function isTextValueValid(
  value: AssessmentValue,
  valueDomain: ValueDomain,
): boolean {
  return (
    valueDomain !== null &&
    valueDomain instanceof TextValueDomain &&
    value !== null &&
    typeof value === "string" &&
    value.length > valueDomain.max_characters
  );
}

export function getDefaultValue(
  assessementType: AssessmentType,
): AssessmentValue {
  switch (assessementType) {
    case AssessmentType.Numeric:
      return 0;
    case AssessmentType.Boolean:
      return false;
    case AssessmentType.Text:
      return "";
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      return [];
  }
}

export function AssessmentInput({
  type,
  value,
  valueDomain,
  handleValueChange,
  valueError,
}: {
  type: AssessmentType;
  value: AssessmentValue | null;
  valueDomain: ValueDomain;
  handleValueChange: (value: AssessmentValue) => void;
  valueError: boolean;
}) {
  const theme = useTheme();

  const [textInputLength, setTextInputLegth] = React.useState<number>(0);

  React.useEffect(() => {
    if (
      valueDomain &&
      valueDomain instanceof TextValueDomain &&
      value !== null &&
      typeof value === "string"
    ) {
      setTextInputLegth(value.length);
    }
  }, [value, valueDomain]);

  const renderNumericInput = (
    value: number,
    valueDomain: NumericValueDomain,
  ) => {
    return (
      <View style={styles.numberStepperInput}>
        <SmallNumberStepper
          defaultValue={value}
          min={valueDomain.min}
          max={valueDomain.max}
          fractionalStepsBelowZero={false}
          onChange={handleValueChange}
        />
      </View>
    );
  };

  const renderBooleanInput = (value: boolean) => {
    return (
      <Switch
        style={[styles.switchInput]}
        value={value}
        onValueChange={handleValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={theme.colors.surface}
      />
    );
  };

  const renderTextInput = (value: string, valueDomain: TextValueDomain) => {
    const handleChangeText = (text: string) => {
      {
        setTextInputLegth(text.length);
        handleValueChange(text);
      }
    };

    return (
      <View style={styles.textInputContainer}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          multiline={true}
          style={[
            styles.textInput,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            valueError && {
              borderColor: theme.colors.error,
              borderWidth: ERROR_BORDER_WIDTH,
            },
          ]}
        />

        <Text style={styles.textInputLenght}>
          {textInputLength > 0.875 * TEXT_MAX_LENGTH
            ? `${textInputLength}/${TEXT_MAX_LENGTH}`
            : " "}
        </Text>
      </View>
    );
  };

  const renderSelectInput = (
    value: string[],
    valueDomain: SelectValueDomain,
  ) => {
    let options: string[] = [];
    if (value && isStringArray(value)) {
      options = value;
    }

    return (
      <ScrollView
        persistentScrollbar={true}
        style={[
          styles.selectInputContainer,
          {
            borderColor: theme.colors.border,
          },
        ]}
      >
        {valueDomain.values.map((v, idx) => {
          const isSelected = options.includes(v);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.selectInputRow,
                {
                  borderColor: theme.colors.border,
                },
                isSelected
                  ? {
                      backgroundColor: theme.colors.primary + "50",
                    }
                  : {
                      backgroundColor: theme.colors.surface,
                    },
              ]}
              onPress={() => {
                if (options.includes(v)) {
                  handleValueChange(options.filter((el) => el !== v));
                } else {
                  if (type === AssessmentType.SingleSelect) {
                    handleValueChange([v]);
                  } else {
                    handleValueChange([v, ...options]);
                  }
                }
              }}
            >
              <Text
                style={[
                  styles.selectInputText,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                {v}
              </Text>
              {isSelected && (
                <Ionicons
                  style={[
                    styles.selectInputCheckmark,
                    { color: theme.colors.primary },
                  ]}
                  name="checkmark"
                ></Ionicons>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  let renderInput = () => <Text>Wrong assessment type</Text>;

  switch (type) {
    case AssessmentType.Numeric:
      if (
        valueDomain &&
        valueDomain instanceof NumericValueDomain &&
        value !== null &&
        typeof value === "number"
      ) {
        renderInput = () => renderNumericInput(value, valueDomain);
      }
      break;
    case AssessmentType.Boolean:
      if (value !== null && typeof value === "boolean") {
        renderInput = () => renderBooleanInput(value);
      }
      break;
    case AssessmentType.Text:
      if (
        valueDomain &&
        valueDomain instanceof TextValueDomain &&
        value !== null &&
        typeof value === "string"
      ) {
        renderInput = () => renderTextInput(value, valueDomain);
      }
      break;
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      if (
        valueDomain &&
        valueDomain instanceof SelectValueDomain &&
        value !== null &&
        isStringArray(value)
      ) {
        renderInput = () => renderSelectInput(value, valueDomain);
      }
  }
  return renderInput();
}

const styles = StyleSheet.create({
  selectInputContainer: {
    maxHeight: 320,
    borderWidth: 0,
    borderRadius: 8,
    width: "90%",
    alignSelf: "center",
  },
  selectInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 45,
    paddingLeft: 20,
    paddingRight: 10,
    width: "94%",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
    marginHorizontal: 8,
  },
  selectInputText: {
    fontSize: 16,
  },
  selectInputCheckmark: {
    fontSize: 20,
  },
  switchInput: {
    height: 50,
    transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
    alignSelf: "center",
  },
  numberStepperInput: {
    height: 55,
    width: 150,
    alignSelf: "center",
  },
  textInputContainer: {
    padding: 8,
    paddingTop: 8,
    paddingBottom: 8,
    width: "100%",
    justifyContent: "center",
    alignSelf: "center",
    flexDirection: "column",
  },
  textInput: {
    textAlignVertical: "top",
    borderWidth: 1,
    fontSize: 16,
    maxHeight: 70,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: "100%",
    justifyContent: "center",
    alignSelf: "center",
    flexDirection: "row",
  },
  textInputLenght: {
    alignSelf: "flex-end",
    margin: 4,
  },
});
