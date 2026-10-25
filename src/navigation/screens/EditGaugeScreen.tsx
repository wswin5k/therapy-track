import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { useSQLiteContext } from "expo-sqlite";

import { eStyles, PRESSABLE_HEIGHT } from "../../commonStyles";
import { DropdownPicker } from "../../components/DropdownPicker";
import {
  EmptyTreatment,
  Gauge,
  OperationAny,
  OperationBoolean,
  OperationNumber,
} from "../../models/Gauge";
import {
  Column,
  dbColumnsGetAll,
  SourceType,
} from "../../models/dbColumnService";
import { ModalPicker } from "../../components/ModalPicker";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import { dbInsertGauge } from "../../models/dbAccess";

function getEmptyTreatmentLabel(value: EmptyTreatment): string {
  switch (value) {
    case EmptyTreatment.Omit:
      return "Omit";
    case EmptyTreatment.ZeroFill:
      return "Use zeros";
  }
}

function getOperationLabel(value: OperationAny): string {
  switch (value) {
    case OperationBoolean.PercentTrue:
      return "Percent Yes";
    case OperationBoolean.PercentFalse:
      return "Percent No";
    case OperationNumber.Average:
      return "Average";
    case OperationNumber.Total:
      return "Total";
    case OperationNumber.Minimum:
      return "Minimum";
    case OperationNumber.Maximum:
      return "Maximum";
    case OperationNumber.PercentNotZero:
      return "% not zero";
  }
}

export function EditGaugeScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const theme = useTheme();

  const [columns, setColumns] = React.useState<Column[]>([]);
  const [operationsDomain, setOperationsDomain] = React.useState<
    OperationAny[]
  >(Object.values(OperationNumber));

  const [column, setColumn] = React.useState<Column | null>(null);
  const [columnError, setColumnError] = React.useState(false);
  const [operation, setOperation] = React.useState<OperationAny>(
    operationsDomain[0],
  );
  const [lengthInDays, setLengthInDays] = React.useState<number>(7);
  const [emptyTreatment, setEmptyTreatment] = React.useState<EmptyTreatment>(
    EmptyTreatment.Omit,
  );
  const [precision, setPrecision] = React.useState<number>(2);

  const loadData = React.useCallback(async () => {
    const newColumns = await dbColumnsGetAll(db);
    setColumns(newColumns);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      const gaugeInit = (route.params as { gauge?: Gauge }).gauge;

      if (gaugeInit) {
        setEmptyTreatment(gaugeInit.emptyTreatment);
      }
      loadData();
    }, [loadData, route.params]),
  );

  const validate = (): {
    sourceColumn: Column;
    operation: OperationAny;
    emptyTreatment: EmptyTreatment;
    lengthInDays: number;
    precision: number;
  } | null => {
    if (column) {
      setColumnError(false);
      return {
        sourceColumn: column,
        operation,
        emptyTreatment,
        lengthInDays,
        precision,
      };
    } else {
      setColumnError(true);
    }
    return null;
  };

  const handleSave = async () => {
    const validatedData = validate();

    if (validatedData) {
      dbInsertGauge(db, validatedData);
      navigation.goBack();
    }
  };

  const handleEmptyTreatmentChange = (value: EmptyTreatment) => {
    setEmptyTreatment(value);
  };

  const handleColumnChange = (value: Column) => {
    setColumn(value);
    let newOperationsDomain: OperationAny[] = Object.values(OperationNumber);
    if (value.sourceType == SourceType.AssessmentBoolean) {
      newOperationsDomain = Object.values(OperationBoolean);
    }
    setOperationsDomain(newOperationsDomain);
    setOperation(newOperationsDomain[0]);
  };

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.mainScrollContainer}
        contentContainerStyle={eStyles.mainScrollContentContainer}
      >
        <View style={styles.rowContainer}>
          <ModalPicker
            values={columns}
            selectedValue={column}
            onValueChange={handleColumnChange}
            getLabel={(c) => c.label}
            pressableStyle={{
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
            placeholder={t("Select source records")}
            error={columnError}
          />
        </View>

        <View style={styles.rowEmptyValuesContainer}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Operation")}
          </Text>
          <View style={[styles.pickerContainer]}>
            <DropdownPicker
              options={operationsDomain}
              initialValue={operation}
              onValueChange={(value) => setOperation(value)}
              getLabel={getOperationLabel}
              pressableStyle={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            />
          </View>
        </View>
        <View style={styles.rowEmptyValuesContainer}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Length in days")}
          </Text>
          <View style={styles.numberStepperContainer}>
            <SmallNumberStepper
              onChange={(value) => setLengthInDays(value)}
              defaultValue={lengthInDays}
              allowFractions={false}
              min={1}
            />
          </View>
        </View>

        <View style={styles.rowEmptyValuesContainer}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Days with no values")}
          </Text>
          <View style={[styles.pickerContainer]}>
            <DropdownPicker
              options={Object.values(EmptyTreatment)}
              initialValue={EmptyTreatment.ZeroFill}
              onValueChange={handleEmptyTreatmentChange}
              getLabel={getEmptyTreatmentLabel}
              pressableStyle={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            />
          </View>
        </View>
        <View style={styles.rowEmptyValuesContainer}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Decimal precision")}
          </Text>
          <View style={styles.numberStepperContainer}>
            <SmallNumberStepper
              onChange={(value) => setPrecision(value)}
              defaultValue={precision}
              allowFractions={false}
              min={0}
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
    marginBottom: 32,
  },
  rowEmptyValuesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  numberStepperContainer: {
    width: "45%",
    height: PRESSABLE_HEIGHT,
  },
  switch: {
    transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
    height: PRESSABLE_HEIGHT,
  },
  pickerContainer: {
    justifyContent: "center",
    width: "45%",
    overflow: "hidden",
  },
});
