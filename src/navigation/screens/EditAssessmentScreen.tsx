import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NAME_MAX_LENGHT } from "../../models/MedicineSchedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { assessmentTypeToDisplayForm } from "../enumMappings";
import {
  Assessment,
  AssessmentType,
  ValueDomain,
} from "../../models/AssessmentSchedule";
import { ModalPicker } from "../../components/ModalPicker";
import { useSQLiteContext } from "expo-sqlite";
import { dbGetAssessments, dbUpdateAssessment } from "../../models/dbAccess";
import { ERROR_BORDER_WIDTH } from "../commonConsts";

type EditAssessmentScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditAssessmentScreen"
>;

export function EditAssessmentScreen() {
  const route = useRoute();
  const navigation = useNavigation<EditAssessmentScreenNavigationProp>();
  const theme = useTheme();
  const db = useSQLiteContext();

  const [name, setName] = React.useState("");
  const [assessmentType, setAssessmentType] =
    React.useState<AssessmentType | null>(null);

  const [nameChanged, setNameChanged] = React.useState(false);
  const [typeInputDisabled, setTypeInputDisabled] = React.useState(false);

  const [nameError, setNameError] = React.useState(false);
  const [assessmentTypeError, setAssessmentTypeError] = React.useState(false);

  const [mode, setMode] = React.useState<
    "save-and-go-back" | "schedule" | "one-time"
  >("save-and-go-back");

  const [assessmentsNames, setAssessmentsNames] = React.useState<string[]>([]);

  const loadAssessments = React.useCallback(async () => {
    const assessments = await dbGetAssessments(db);

    const newAssessmentsNames = assessments.map((a) => a.name);
    setAssessmentsNames(newAssessmentsNames);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as {
        mode: "save-and-go-back" | "schedule" | "one-time";
        assessment: Assessment;
      };
      setMode(params.mode);
      if (params.mode === "save-and-go-back") {
        setTypeInputDisabled(true);
      }

      const assessmentInit = params.assessment;
      if (assessmentInit) {
        setName(assessmentInit.name);
        setAssessmentType(assessmentInit.type);
      }
      loadAssessments();
    }, [route.params, loadAssessments]),
  );

  const validate = (
    nameIsOkWhenNotChanged: boolean,
  ): {
    name: string;
    type: AssessmentType;
    valueDomain: ValueDomain;
  } | null => {
    let asssessmentValidated = true;

    let newNameError = true;
    let newAssessmentTypeError = true;

    let nameValidated = name;
    if (nameIsOkWhenNotChanged && !nameChanged) {
      newNameError = false;
    } else {
      const nameValidated = name.trim();
      if (nameValidated && nameValidated.length < NAME_MAX_LENGHT) {
        if (!assessmentsNames.includes(nameValidated)) {
          const validName = /^[\p{L}\p{N} ]+$/u;
          if (validName.test(nameValidated)) {
            newNameError = false;
          }
        }
      }
    }

    if (assessmentType) {
      newAssessmentTypeError = false;
    }

    if (newAssessmentTypeError || newNameError) {
      asssessmentValidated = false;
    }

    setNameError(newNameError);
    setAssessmentTypeError(newAssessmentTypeError);

    if (asssessmentValidated && assessmentType) {
      return {
        name: nameValidated,
        type: assessmentType,
        valueDomain: null,
      };
    }
    return null;
  };

  const handleSave = async () => {
    if (mode === "schedule") {
      const assessmentValidated = validate(false);
      if (!assessmentValidated) {
        return;
      }
      navigation.navigate("EditAssessmentScheduleScreen", {
        assessment: assessmentValidated,
      });
    } else if (mode === "save-and-go-back") {
      const assessmentValidated = validate(true);
      if (!assessmentValidated) {
        return;
      }
      dbUpdateAssessment(db, { dbId: 1, ...assessmentValidated });
      navigation.goBack();
    } else {
      // mode === "one-time"
      const assessmentValidated = validate(false);
      if (!assessmentValidated) {
        return;
      }
      navigation.navigate("EditSingleMeasurmentScreen", {
        assessment: assessmentValidated,
      });
    }
  };

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.rowContainer]}>
          <TextInput
            placeholder="Assessment Name"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
              nameError
                ? {
                    borderColor: theme.colors.error,
                    borderWidth: ERROR_BORDER_WIDTH,
                  }
                : {},
            ]}
            onChangeText={(text: string) => {
              setNameChanged(true);
              setName(text);
            }}
            value={name}
          />
        </View>
        <ModalPicker
          values={Object.values(AssessmentType)}
          selectedValue={assessmentType}
          onValueChange={(itemValue) => {
            setAssessmentType(itemValue);
          }}
          getLabel={assessmentTypeToDisplayForm}
          pressableStyle={styles.fullWidthPickerContainer}
          error={assessmentTypeError}
          disabled={typeInputDisabled}
        />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.nextButtonText}>
            {mode === "save-and-go-back" ? "Save" : "Next"}
          </Text>
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
    fontWeight: "500",
    marginBottom: 8,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
    height: 60,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    width: "100%",
  },
  ingredientInput: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    width: "100%",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  ingredientsList: {
    marginBottom: 15,
  },
  pickerContainer: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
  },
  fullWidthPickerContainer: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 5,
  },
  picker: {
    width: "100%",
    height: 60,
  },
  pickerItem: {
    fontSize: 16,
  },
  removeButton: {
    width: 20,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonPlaceholder: {
    width: 20,
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
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
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
});
