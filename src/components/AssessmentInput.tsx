import {
  AssessmentType,
  SelectValueDomain,
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
import { isStringArray } from "../utils";
import Ionicons from "@react-native-vector-icons/ionicons";

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

  const renderNumericInput = () => {
    return (
      <View style={styles.numberStepperInput}>
        <SmallNumberStepper
          defaultValue={value ? (value as number) : undefined}
          onChange={handleValueChange}
        />
      </View>
    );
  };

  const renderBooleanInput = () => {
    return (
      <Switch
        style={[styles.switchInput]}
        value={value === true}
        onValueChange={handleValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={theme.colors.surface}
      />
    );
  };

  const renderTextInput = () => {
    return (
      <TextInput
        value={value as string}
        onChangeText={handleValueChange}
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
    );
  };

  const renderSelectInput = (valueDomain: SelectValueDomain) => {
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
            //backgroundColor: theme.colors.surface,
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
      renderInput = renderNumericInput;
      break;
    case AssessmentType.Boolean:
      renderInput = renderBooleanInput;
      break;
    case AssessmentType.Text:
      renderInput = renderTextInput;
      break;
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      if (valueDomain && valueDomain instanceof SelectValueDomain) {
        renderInput = () => renderSelectInput(valueDomain);
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
  textInput: {
    textAlignVertical: "top",
    borderWidth: 1,
    fontSize: 16,
    height: 100,
    borderRadius: 8,
    padding: 8,
    paddingTop: 8,
    paddingBottom: 8,
    width: "90%",
    justifyContent: "center",
    alignSelf: "center",
    flexDirection: "row",
  },
});
