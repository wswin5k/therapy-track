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
import { NAME_MAX_LENGTH } from "../../models/MedicineSchedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { assessmentTypeToDisplayForm } from "../enumMappings";
import {
  Assessment,
  AssessmentType,
  NumericValueDomain,
  SelectValueDomain,
  TextValueDomain,
  ValueDomain,
} from "../../models/AssessmentSchedule";
import { ModalPicker } from "../../components/ModalPicker";
import { useSQLiteContext } from "expo-sqlite";
import { dbGetAssessments, dbUpdateAssessment } from "../../models/dbAccess";
import { DISABLED_OPACITY, ERROR_BORDER_WIDTH } from "../commonConsts";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "../../components/SmallNumberStepper";

export const TEXT_MAX_LENGTH = 200;
const DEFAULT_NUMERIC_MAX = 10;
const DEFAULT_NUMERIC_MIN = 0;
const NUMERIC_MAX = 1_000_000;
const NUMERIC_MIN = -1_000_000;

export function getDefaultValueDomain(
  type: AssessmentType,
): ValueDomain | null {
  switch (type) {
    case AssessmentType.Text:
      return new TextValueDomain(TEXT_MAX_LENGTH);
    case AssessmentType.Numeric:
      return new NumericValueDomain(DEFAULT_NUMERIC_MIN, DEFAULT_NUMERIC_MAX);
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      return new SelectValueDomain(["", ""]);
    default:
      return null;
  }
}

type EditAssessmentScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditAssessmentScreen"
>;

export function EditAssessmentScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation<EditAssessmentScreenNavigationProp>();
  const theme = useTheme();
  const db = useSQLiteContext();

  const [assessmentId, setAssessmentId] = React.useState<number | null>(null);
  const [name, setName] = React.useState("");
  const [assessmentType, setAssessmentType] =
    React.useState<AssessmentType | null>(null);
  const [referenceValueDomain, setReferenceValueDomain] =
    React.useState<ValueDomain | null>(null);
  const [valueDomain, setValueDomain] = React.useState<ValueDomain>(null);
  const [selectValueDomainErrors, setSelectValueDomainErrors] = React.useState([
    false,
  ]);

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
        setAssessmentId(assessmentInit.dbId);
        setName(assessmentInit.name);
        setAssessmentType(assessmentInit.type);
        setReferenceValueDomain(assessmentInit.valueDomain);
        setValueDomain(assessmentInit.valueDomain);
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
    const validName = /^[\p{L}\p{N} ]+$/u;

    let asssessmentValidated = true;

    let newNameError = true;
    let newAssessmentTypeError = true;
    let newSelectValueDomainErrors = new Array(
      selectValueDomainErrors.length,
    ).fill(true);

    let nameValidated = name;
    // todo: document use case does it fullfill
    if (nameIsOkWhenNotChanged && !nameChanged) {
      newNameError = false;
    } else {
      const nameValidated = name.trim();
      if (nameValidated && nameValidated.length < NAME_MAX_LENGTH) {
        if (!assessmentsNames.includes(nameValidated)) {
          if (validName.test(nameValidated)) {
            newNameError = false;
          }
        }
      }
    }

    if (assessmentType) {
      newAssessmentTypeError = false;
    }

    let valueDomainValidated = null;
    if (
      assessmentType === AssessmentType.SingleSelect ||
      assessmentType === AssessmentType.MultiSelect
    ) {
      if (valueDomain && valueDomain instanceof SelectValueDomain) {
        newSelectValueDomainErrors = valueDomain.values.map(
          (v) => !v && validName.test(v),
        );

        let valuesValidated = [];
        for (let i = 0; i < valueDomain.values.length; i++) {
          const value = valueDomain.values[i].trim();
          valuesValidated.push(value);
          if (valueDomain.values.slice(0, i).indexOf(value) > -1) {
            newSelectValueDomainErrors[i] = true;
          }
          if (!value) {
            newSelectValueDomainErrors[i] = true;
          }
          if (value.length > NAME_MAX_LENGTH) {
            newSelectValueDomainErrors[i] = true;
          }
          if (!validName.test(value)) {
            newSelectValueDomainErrors[i] = true;
          }
        }
        valueDomainValidated = new SelectValueDomain(valuesValidated);
      }
    } else {
      valueDomainValidated = valueDomain;

      newSelectValueDomainErrors = new Array(
        selectValueDomainErrors.length,
      ).fill(false);
    }

    setNameError(newNameError);
    setAssessmentTypeError(newAssessmentTypeError);
    setSelectValueDomainErrors(newSelectValueDomainErrors);

    if (
      newAssessmentTypeError ||
      newNameError ||
      newSelectValueDomainErrors.some((v) => v)
    ) {
      asssessmentValidated = false;
    }

    if (asssessmentValidated && assessmentType) {
      return {
        name: nameValidated,
        type: assessmentType,
        valueDomain: valueDomainValidated,
      };
    }
    return null;
  };

  const handleAssessmentTypePick = (itemValue: AssessmentType) => {
    setAssessmentType(itemValue);
    const newValueDomain = getDefaultValueDomain(itemValue);
    setValueDomain(newValueDomain);
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
      if (assessmentId !== null) {
        await dbUpdateAssessment(db, {
          dbId: assessmentId,
          ...assessmentValidated,
        });
      } else {
        throw Error("Assessment ID has not been set.");
      }
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

  const renderSelectValueDomain = (valueDomain: SelectValueDomain) => {
    let notRemovableOptions: string[] = [];
    if (
      referenceValueDomain &&
      referenceValueDomain instanceof SelectValueDomain
    ) {
      notRemovableOptions = referenceValueDomain.values;
    }

    return (
      <>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Select options")}
        </Text>
        <View>
          {valueDomain.values.map((v, idx) => {
            const editable = !notRemovableOptions.includes(v);
            return (
              <View key={idx} style={styles.selectRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[
                      styles.selectInput,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      },
                      editable
                        ? {
                            color: theme.colors.text,
                          }
                        : {
                            color: theme.colors.textTertiary,
                            opacity: DISABLED_OPACITY,
                          },
                      selectValueDomainErrors[idx]
                        ? {
                            borderColor: theme.colors.error,
                            borderWidth: ERROR_BORDER_WIDTH,
                          }
                        : {},
                    ]}
                    onChangeText={(text: string) => {
                      setValueDomain(
                        new SelectValueDomain(
                          valueDomain.values.map((v, i) =>
                            i === idx ? text : v,
                          ),
                        ),
                      );
                    }}
                    defaultValue={v}
                    autoCapitalize="none"
                    editable={editable}
                  />
                </View>
                {valueDomain.values.length > 1 &&
                !notRemovableOptions.includes(v) ? (
                  <TouchableOpacity
                    onPress={() => {
                      setValueDomain(
                        new SelectValueDomain(
                          valueDomain.values.filter((_, i) => i !== idx),
                        ),
                      );
                      setSelectValueDomainErrors(
                        selectValueDomainErrors.filter((_, i) => i !== idx),
                      );
                    }}
                    style={styles.removeButton}
                  >
                    <Text
                      style={[
                        styles.removeButtonText,
                        { color: theme.colors.text },
                      ]}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.removeButtonPlaceholder} />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.selectRow}>
          <TouchableOpacity
            onPress={() => {
              setValueDomain(
                new SelectValueDomain([...valueDomain.values, ""]),
              );
              setSelectValueDomainErrors([...selectValueDomainErrors, false]);
            }}
            style={[styles.addButton, { borderColor: theme.colors.primary }]}
          >
            <Text
              style={[styles.addButtonText, { color: theme.colors.primary }]}
            >
              + Add Value
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderNumericValueDomain = () => {
    const handleUpdateMaximum = (value: number) => {
      setValueDomain((oldValueDomain) => {
        if (oldValueDomain && oldValueDomain instanceof NumericValueDomain) {
          return new NumericValueDomain(oldValueDomain.min, value);
        } else {
          return new NumericValueDomain(DEFAULT_NUMERIC_MIN, value);
        }
      });
    };
    const handleUpdateMinimum = (value: number) => {
      setValueDomain((oldValueDomain) => {
        if (oldValueDomain && oldValueDomain instanceof NumericValueDomain) {
          return new NumericValueDomain(value, oldValueDomain.max);
        } else {
          return new NumericValueDomain(value, DEFAULT_NUMERIC_MAX);
        }
      });
    };

    let minimumMax = NUMERIC_MAX;
    let maximumMin = -NUMERIC_MIN;
    if (
      referenceValueDomain &&
      referenceValueDomain instanceof NumericValueDomain
    ) {
      minimumMax = referenceValueDomain.min;
      maximumMin = referenceValueDomain.max;
    }
    let minimumDefault = DEFAULT_NUMERIC_MIN;
    let maximumDefault = DEFAULT_NUMERIC_MAX;
    if (valueDomain && valueDomain instanceof NumericValueDomain) {
      minimumDefault = valueDomain.min;
      maximumDefault = valueDomain.max;
    }

    return (
      <View>
        <View style={[styles.rowContainer]}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Minimum")}
          </Text>
          <View style={styles.numberStepperInput}>
            <SmallNumberStepper
              defaultValue={minimumDefault}
              min={NUMERIC_MIN}
              max={minimumMax}
              fractionalStepsBelowZero={false}
              onChange={handleUpdateMinimum}
            />
          </View>
        </View>
        <View style={[styles.rowContainer]}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Maximum")}
          </Text>
          <View style={styles.numberStepperInput}>
            <SmallNumberStepper
              defaultValue={maximumDefault}
              min={maximumMin}
              max={NUMERIC_MAX}
              fractionalStepsBelowZero={false}
              onChange={handleUpdateMaximum}
            />
          </View>
        </View>
      </View>
    );
  };

  let renderValueDomain = () => <View></View>;

  switch (assessmentType) {
    case AssessmentType.Numeric:
      renderValueDomain = renderNumericValueDomain;
      break;
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      if (valueDomain && valueDomain instanceof SelectValueDomain) {
        renderValueDomain = () => renderSelectValueDomain(valueDomain);
      }
      break;
  }

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.nameContainer]}>
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
          onValueChange={handleAssessmentTypePick}
          getLabel={assessmentTypeToDisplayForm}
          pressableStyle={styles.fullWidthPickerContainer}
          error={assessmentTypeError}
          disabled={typeInputDisabled}
        />
        {renderValueDomain()}
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
    paddingBottom: 110,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 5,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
    height: 60,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    margin: 15,
  },
  numberStepperInput: {
    height: 55,
    width: 150,
    alignSelf: "center",
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    width: "100%",
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginLeft: 20,
    marginHorizontal: 20,
    gap: 10,
  },
  selectInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginLeft: 20,
    fontSize: 16,
  },
  fullWidthPickerContainer: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    gap: 10,
    marginBottom: 5,
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
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
    height: 50,
    paddingHorizontal: 15,
    marginLeft: 20,
    marginRight: 30,
    fontSize: 16,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
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
});
