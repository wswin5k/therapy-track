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
import {
  NAME_MAX_LENGTH,
  SELECT_VALUE_MAX_LENGTH,
  VALID_NAME,
} from "../../validationConstants";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { assessmentTypeToDisplayForm } from "../enumMappings";
import {
  Assessment,
  ValueType,
  NumericValueDomain,
  SelectValueDomain,
  TextValueDomain,
  ValueDomain,
} from "../../models/AssessmentSchedule";
import { ModalPicker } from "../../components/ModalPicker";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetAssessments,
  dbInsertAssessment,
  dbUpdateAssessment,
} from "../../models/dbAccess";
import { DISABLED_OPACITY, ERROR_BORDER_WIDTH } from "../commonConsts";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import { isEqualLowerCase } from "../utils";
import {
  DEFAULT_BORDER_RADIUS,
  eStyles,
  EDIT_PRESSABLE_HEIGHT,
} from "../../commonStyles";

export const TEXT_MAX_LENGTH = 200;
const DEFAULT_NUMERIC_MAX = 10;
const DEFAULT_NUMERIC_MIN = 0;
const NUMERIC_MAX = 1_000_000;
const NUMERIC_MIN = -1_000_000;

export function getDefaultValueDomain(type: ValueType): ValueDomain | null {
  switch (type) {
    case ValueType.Text:
      return new TextValueDomain(TEXT_MAX_LENGTH);
    case ValueType.Numeric:
      return new NumericValueDomain(DEFAULT_NUMERIC_MIN, DEFAULT_NUMERIC_MAX);
    case ValueType.SingleSelect:
    case ValueType.MultiSelect:
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
  const [assessmentType, setAssessmentType] = React.useState<ValueType | null>(
    null,
  );
  const [referenceValueDomain, setReferenceValueDomain] =
    React.useState<ValueDomain | null>(null);
  const [valueDomain, setValueDomain] = React.useState<ValueDomain>(null);
  const [selectValueDomainErrors, setSelectValueDomainErrors] = React.useState([
    false,
  ]);

  // when modyfing an assessment we don't want to check for duplicate names
  const [initialName, setInitialName] = React.useState<string | null>(null);
  const [typeInputDisabled, setTypeInputDisabled] = React.useState(false);

  const [nameError, setNameError] = React.useState(false);
  const [assessmentTypeError, setAssessmentTypeError] = React.useState(false);

  const [mode, setMode] = React.useState<
    "create-and-go-back" | "update-and-go-back" | "schedule" | "one-time"
  >("create-and-go-back");

  const [assessmentsNames, setAssessmentsNames] = React.useState<string[]>([]);

  const loadAssessments = React.useCallback(async () => {
    const assessments = await dbGetAssessments(db);

    const newAssessmentsNames = assessments.map((a) => a.name.toLowerCase());
    setAssessmentsNames(newAssessmentsNames);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as {
        mode:
          "create-and-go-back" | "update-and-go-back" | "schedule" | "one-time";
        assessment: Assessment;
      };
      setMode(params.mode);
      if (params.mode === "update-and-go-back") {
        setTypeInputDisabled(true);
      }

      const assessmentInit = params.assessment;
      if (assessmentInit) {
        setAssessmentId(assessmentInit.dbId);
        setName(assessmentInit.name);
        setInitialName(assessmentInit.name);
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
    type: ValueType;
    valueDomain: ValueDomain;
  } | null => {
    let asssessmentValidated = true;

    let newNameError = true;
    let newAssessmentTypeError = true;
    let newSelectValueDomainErrors = new Array(
      selectValueDomainErrors.length,
    ).fill(true);

    let nameValidated = name.trim();
    const nameSameAsInitial = isEqualLowerCase(nameValidated, initialName);
    if (
      nameValidated &&
      ((nameValidated.length < NAME_MAX_LENGTH &&
        !assessmentsNames.includes(nameValidated.toLowerCase()) &&
        VALID_NAME.test(nameValidated)) ||
        (nameIsOkWhenNotChanged && nameSameAsInitial))
    ) {
      newNameError = false;
    }

    if (assessmentType) {
      newAssessmentTypeError = false;
    }

    let valueDomainValidated = null;
    if (
      assessmentType === ValueType.SingleSelect ||
      assessmentType === ValueType.MultiSelect
    ) {
      if (valueDomain && valueDomain instanceof SelectValueDomain) {
        newSelectValueDomainErrors = valueDomain.values.map(
          (v) => !v && VALID_NAME.test(v),
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
          if (value.length > SELECT_VALUE_MAX_LENGTH) {
            newSelectValueDomainErrors[i] = true;
          }
          if (!VALID_NAME.test(value)) {
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

  const handleAssessmentTypePick = (itemValue: ValueType) => {
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
    } else if (mode === "one-time") {
      const assessmentValidated = validate(false);
      if (!assessmentValidated) {
        return;
      }
      navigation.navigate("EditSingleMeasurementScreen", {
        assessment: assessmentValidated,
      });
    } else if (mode === "update-and-go-back") {
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
      // mode === "create-and-go-back"
      const assessmentValidated = validate(false);
      if (!assessmentValidated) {
        return;
      }
      await dbInsertAssessment(db, assessmentValidated);
      navigation.goBack();
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
        <View style={styles.rowActiveIngredientsHeader}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Select options")}
          </Text>
        </View>

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
        <View style={[styles.rowNumericLimitContainer]}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
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
        <View style={[styles.rowNumericLimitContainer]}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
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
    case ValueType.Numeric:
      renderValueDomain = renderNumericValueDomain;
      break;
    case ValueType.SingleSelect:
    case ValueType.MultiSelect:
      if (valueDomain && valueDomain instanceof SelectValueDomain) {
        renderValueDomain = () => renderSelectValueDomain(valueDomain);
      }
      break;
  }

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowNameContainer]}>
          <TextInput
            placeholder="Assessment Name"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              eStyles.fullWidthTextInputPressable,
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
              setName(text);
            }}
            value={name}
          />
        </View>
        <View style={styles.rowPickerContainer}>
          <ModalPicker
            values={Object.values(ValueType)}
            selectedValue={assessmentType}
            onValueChange={handleAssessmentTypePick}
            getLabel={assessmentTypeToDisplayForm}
            pressableStyle={eStyles.fullWidthPickerPressable}
            error={assessmentTypeError}
            disabled={typeInputDisabled}
            disabledMessage={t(
              "The type of an existing assessment cannot be modified.",
            )}
          />
        </View>
        {renderValueDomain()}
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
            {["create-and-go-back", "update-and-go-back"].includes(mode)
              ? "Save"
              : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const SELECT_HEIGHT: number = 50;

const styles = StyleSheet.create({
  rowNameContainer: {
    marginBottom: 28,
  },
  rowPickerContainer: {
    marginBottom: 32,
  },
  rowNumericLimitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  numberStepperInput: {
    width: "50%",
    height: EDIT_PRESSABLE_HEIGHT,
  },
  rowActiveIngredientsHeader: {
    marginBottom: 12,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 20,
    gap: 10,
  },
  selectInput: {
    height: SELECT_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 12,
    marginLeft: 20,
    fontSize: 17,
  },
  removeButton: {
    width: 20,
    height: SELECT_HEIGHT,
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
    height: SELECT_HEIGHT,
    paddingHorizontal: 15,
    marginLeft: 20,
    marginRight: 30,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
