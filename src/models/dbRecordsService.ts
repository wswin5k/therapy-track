import { SQLiteDatabase } from "expo-sqlite";
import {
  dbGetAssessments,
  dbGetAssessmentSchedules,
  dbGetGroups,
  dbGetMedicines,
  dbGetMedicineSchedules,
  dbGetScheduledDosageRecords,
  dbGetScheduledMeasurementRecords,
  dbGetUnscheduledDosageRecords,
  dbGetUnscheduledMeasurementRecords,
} from "./dbAccess";
import {
  baseUnitShorFormPlural,
  ingredientAmountUnitEnumToDisplayForm,
} from "../navigation/enumMappings";
import { Metric, SourceType } from "./Gauge";
import {
  Assessment,
  AssessmentSchedule,
  ValueType,
} from "./AssessmentSchedule";
import { serializeDateOnly } from "../dateOnlyUtils";
import { Group } from "./Frequency";
import {
  AssessmentValue,
  ScheduledDosageRecord,
  ScheduledMeasurementRecord,
  UnscheduledDosageRecord,
  UnscheduledMeasurementRecord,
} from "./Records";
import {
  IngredientAmountUnit,
  isWeightUnit,
  maxWeightUnit,
  Medicine,
  MedicineSchedule,
  weightUnitToGramsMultiplier,
} from "./MedicineSchedule";
import { ColumnType } from "./Settings";

export async function dbColumnsGetAll(db: SQLiteDatabase): Promise<Metric[]> {
  const medicines = await dbGetMedicines(db);
  const columns = new Map();
  medicines.forEach((m) => {
    const baseUnitLabel = baseUnitShorFormPlural(m.baseUnit);
    columns.set(
      m.getLabel(),
      new Metric(m.getLabel(), SourceType.Medicine, [m.dbId]),
    );
    m.activeIngredients.forEach((ai) => {
      const label = ai.getLabel(baseUnitLabel);
      const column = columns.get(label);
      if (column) {
        column.sourceIds.push(label);
      } else {
        columns.set(
          label,
          new Metric(label, SourceType.ActiveIngredientWithForm, [m.dbId]),
        );
      }

      const labelShort = ai.getLabelWithoutUnit();
      const columnShort = columns.get(labelShort);
      if (columnShort) {
        columnShort.sourceIds.push(m.dbId);
      } else {
        columns.set(
          label,
          new Metric(label, SourceType.ActiveIngredientWithoutForm, [m.dbId]),
        );
      }
    });
  });

  const assessments = dbGetAssessments(db);
  (await assessments).forEach((a) => {
    const label = a.getLabel();
    if (a.type === ValueType.Numeric) {
      columns.set(
        label,
        new Metric(label, SourceType.AssessmentNumeric, [a.dbId]),
      );
    } else if (a.type === ValueType.Boolean) {
      columns.set(
        label,
        new Metric(label, SourceType.AssessmentBoolean, [a.dbId]),
      );
    }
  });

  return Array.from(columns.values());
}

export class NewColumnConfig {
  constructor(
    public type: ColumnType,
    public source_created_at: Date,
  ) {}
}

class RecordsData {
  constructor(
    public dayToLabelToValue: Map<string, Map<string, AssessmentValue>>,
    public labels: string[],
    public labelToValueType: Map<string, ValueType>,
    public labelToColumnConfig: Map<string, NewColumnConfig>,
    public labelToUnit: Map<string, string>,
  ) {}
}

export async function getAssessmentRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<RecordsData> {
  const scheuledMeasurementRecrods = await dbGetScheduledMeasurementRecords(
    db,
    startDate,
    endDate,
  );
  const unscheduledMeasurementRecords =
    await dbGetUnscheduledMeasurementRecords(db, startDate, endDate);

  const assessmentSchedules = await dbGetAssessmentSchedules(db);
  const idToAssessmentSchedule = new Map<number, AssessmentSchedule>();
  assessmentSchedules.forEach((a) => {
    idToAssessmentSchedule.set(a.dbId, a);
  });

  const groups = await dbGetGroups(db);
  const idToGroup = new Map<number, Group>();
  groups.forEach((g) => {
    idToGroup.set(g.dbId, g);
  });

  const assessments = await dbGetAssessments(db);
  const idToAssessment = new Map<number, Assessment>();
  assessments.forEach((a) => {
    idToAssessment.set(a.dbId, a);
  });

  const dayToLabelToValues = new Map<string, Map<string, AssessmentValue>>();

  const labelToValueType = new Map();
  const newColumnConfigs = new Map();

  const digestMeasurementRecord = (
    record: ScheduledMeasurementRecord | UnscheduledMeasurementRecord,
    assessment: Assessment,
    groupId: number | null,
  ) => {
    const group = groupId ? (idToGroup.get(groupId) ?? null) : null;
    const label = assessment.getLabel(group?.name);

    labelToValueType.set(label, assessment.type);

    newColumnConfigs.set(
      label,
      new NewColumnConfig(ColumnType.Assessment, assessment.createdAt),
    );

    const dateStr = serializeDateOnly(record.date);
    const dailyRow =
      dayToLabelToValues.get(dateStr) || new Map<string, AssessmentValue>();
    dailyRow.set(label, record.value);
    dayToLabelToValues.set(dateStr, dailyRow);
  };

  for (const record of unscheduledMeasurementRecords) {
    const assessment = idToAssessment.get(record.assessmentId);
    if (!assessment) {
      throw Error("Record not connected to assessment.");
    }
    digestMeasurementRecord(record, assessment, record.groupId);
  }

  for (const record of scheuledMeasurementRecrods) {
    const assessmentSchedule = idToAssessmentSchedule.get(
      record.assessmentScheduleId,
    );
    if (!assessmentSchedule) {
      throw Error("Record not connected to assessment schedule.");
    }
    const assessment = assessmentSchedule.assessment;
    const measurement =
      assessmentSchedule.measurements[record.measurementIndex];

    digestMeasurementRecord(record, assessment, measurement.groupId);
  }

  const labels = Array.from(labelToValueType.keys()).sort();
  const labelToUnit = new Map();

  return new RecordsData(
    dayToLabelToValues,
    labels,
    labelToValueType,
    newColumnConfigs,
    labelToUnit,
  );
}

function applyActiveIngredientWeightUnits(
  dayToLabelToValue: Map<string, Map<string, number>>,
  labelToWeightUnits: Map<string, Set<IngredientAmountUnit>>,
): Map<string, string> {
  // 1. Calculates appropriate weight unit.
  // 2. Updates the record data mapping (dayToLabelToValue) with new amounts.
  // 3. Creates and returns a mapping from a label to unit label.

  const updateRow = (
    labelToValues: Map<string, number>,
    label: string,
    weightUnitMultiplier: number,
  ) => {
    const value = labelToValues.get(label);
    if (!value) {
      return;
    }
    labelToValues.set(label, value / weightUnitMultiplier);
  };

  const labelToUnit = new Map();

  for (const [label, weightUnits] of labelToWeightUnits) {
    const weightUnit = maxWeightUnit([...weightUnits]);
    const weightUnitMultiplier = weightUnitToGramsMultiplier(weightUnit);
    const weightUnitDisplay = ingredientAmountUnitEnumToDisplayForm(weightUnit);

    labelToUnit.set(label, weightUnitDisplay);

    for (const labelToValues of dayToLabelToValue.values()) {
      updateRow(labelToValues, label, weightUnitMultiplier);
    }
  }
  return labelToUnit;
}

function updateHeaderCounter(
  fullHeaderToShortHeader: Map<string, string>,
  shortHeaderCounts: Map<string, number>,
  fullHeader: string,
  shortHeader: string,
) {
  if (!fullHeaderToShortHeader.has(fullHeader)) {
    fullHeaderToShortHeader.set(fullHeader, shortHeader);
    shortHeaderCounts.set(
      shortHeader,
      (shortHeaderCounts.get(shortHeader) || 0) + 1,
    );
  }
}

export async function getMedicineRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<RecordsData> {
  const scheduledDosageRecords = await dbGetScheduledDosageRecords(
    db,
    startDate,
    endDate,
  );
  const unscheduledDosageRecords = await dbGetUnscheduledDosageRecords(
    db,
    startDate,
    endDate,
  );

  const schedules = await dbGetMedicineSchedules(db);
  const idToSchedule = new Map<number, MedicineSchedule>();
  schedules.forEach((s) => {
    idToSchedule.set(s.dbId, s);
  });

  const medicines = await dbGetMedicines(db);
  const idToMedicine = new Map<number, Medicine>();
  medicines.forEach((m) => {
    idToMedicine.set(m.dbId, m);
  });

  const dayToLabelToValues = new Map<string, Map<string, number>>();

  /* to handle shortening of header labels*/
  const fullLabelToShortLabel = new Map<string, string>();
  const shortLabelCounts = new Map<string, number>();

  const activeIngredientLabelToWeightUnits = new Map<
    string,
    Set<IngredientAmountUnit>
  >();
  const newColumnConfigs = new Map();

  const labelToUnit = new Map();

  const digestDosageRecord = (
    record: ScheduledDosageRecord | UnscheduledDosageRecord,
    medicineAmount: number,
    medicine: Medicine,
  ) => {
    const dateStr = serializeDateOnly(record.date);
    const dailyRow =
      dayToLabelToValues.get(dateStr) || new Map<string, number>();

    const baseUnitLabel = baseUnitShorFormPlural(medicine.baseUnit);

    for (const ai of medicine.activeIngredients) {
      let fullLabel = ai.getLabel(baseUnitLabel);
      let shortLabel = ai.getLabelWithoutUnit();

      let weightUnitMultiplier = 1;
      if (isWeightUnit(ai.unit)) {
        weightUnitMultiplier = weightUnitToGramsMultiplier(ai.unit);
        activeIngredientLabelToWeightUnits.set(
          fullLabel,
          (activeIngredientLabelToWeightUnits.get(fullLabel) || new Set()).add(
            ai.unit,
          ),
        );
        activeIngredientLabelToWeightUnits.set(
          shortLabel,
          (activeIngredientLabelToWeightUnits.get(fullLabel) || new Set()).add(
            ai.unit,
          ),
        );
      } else {
        // weight units are set later in applyActiveIngredientWeightUnits
        labelToUnit.set(fullLabel, ai.getUnitLabel());
        labelToUnit.set(shortLabel, ai.getUnitLabel());
      }

      const ccFullHeader = newColumnConfigs.get(fullLabel);
      if (
        !ccFullHeader ||
        ccFullHeader._source_created_at > medicine.createdAt
      ) {
        newColumnConfigs.set(
          fullLabel,
          new NewColumnConfig(ColumnType.ActiveIngredient, medicine.createdAt),
        );
      }
      const ccShortHeader = newColumnConfigs.get(shortLabel);
      if (
        !ccShortHeader ||
        ccShortHeader._source_created_at > medicine.createdAt
      ) {
        newColumnConfigs.set(
          shortLabel,
          new NewColumnConfig(ColumnType.ActiveIngredient, medicine.createdAt),
        );
      }
      updateHeaderCounter(
        fullLabelToShortLabel,
        shortLabelCounts,
        fullLabel,
        shortLabel,
      );

      let amountTotalFullLabel = dailyRow.get(fullLabel) || 0;
      amountTotalFullLabel += ai.amount * medicineAmount * weightUnitMultiplier;
      dailyRow.set(fullLabel, amountTotalFullLabel);
      let amountTotalShortLabel = dailyRow.get(shortLabel) || 0;
      amountTotalShortLabel +=
        ai.amount * medicineAmount * weightUnitMultiplier;
      dailyRow.set(shortLabel, amountTotalShortLabel);
    }

    const label = medicine.getLabel();
    labelToUnit.set(label, medicine.getUnitLabel());

    newColumnConfigs.set(
      label,
      new NewColumnConfig(ColumnType.Medicine, medicine.createdAt),
    );

    let amountTotal = dailyRow.get(label) || 0;
    amountTotal += medicineAmount;
    dailyRow.set(label, amountTotal);

    dayToLabelToValues.set(dateStr, dailyRow);
  };

  for (const record of unscheduledDosageRecords) {
    const medicine = idToMedicine.get(record.medicineId);
    if (!medicine) {
      throw Error("Record not connected to medicine.");
    }
    digestDosageRecord(record, record.amount, medicine);
  }

  for (const record of scheduledDosageRecords) {
    const schedule = idToSchedule.get(record.medicineScheduleId);
    if (!schedule) {
      throw Error("Record not connected to medicine schedule.");
    }
    digestDosageRecord(
      record,
      schedule.dosages[record.dosageIndex].amount,
      schedule.medicine,
    );
  }

  const labelToUnitWeights = applyActiveIngredientWeightUnits(
    dayToLabelToValues,
    activeIngredientLabelToWeightUnits,
  );
  labelToUnitWeights.forEach((unit, label) => labelToUnit.set(label, unit));

  const labelsSet = new Set(labelToUnit.keys());
  // remove full labels from records, configs data and labels set
  // where the coressponding short label count == 1
  for (const [fullLabel, shortLabel] of fullLabelToShortLabel) {
    if (shortLabelCounts.get(shortLabel) === 1) {
      for (const headerToValues of dayToLabelToValues.values()) {
        headerToValues.delete(fullLabel);
        labelsSet.delete(fullLabel);
      }
      newColumnConfigs.delete(fullLabel);
    }
  }
  const labels = [...labelsSet];

  const labelToValueType = new Map();
  labels.forEach((header) => labelToValueType.set(header, ValueType.Numeric));

  return new RecordsData(
    dayToLabelToValues,
    labels,
    labelToValueType,
    newColumnConfigs,
    labelToUnit,
  );
}

export async function getExistingMedicineAndAssessmentNames(
  db: SQLiteDatabase,
): Promise<string[]> {
  const medicines = await dbGetMedicines(db);

  const medicineNames = medicines.map((a) => a.name.toLowerCase());

  const assessments = await dbGetAssessments(db);

  const assessmentNames = assessments.map((a) => a.name.toLowerCase());

  return medicineNames.concat(assessmentNames);
}
