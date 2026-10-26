import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import { dbDeleteGauge, dbGetGauges } from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { lStyles } from "../../commonStyles";
import { Gauge } from "../../models/Gauge";
import { updateGaugeRecord } from "../../models/dbColumnService";

function GaugeListItem({
  gauge,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
  atLeastOneOptionsOpened,
}: {
  gauge: Gauge;
  loadData: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
  atLeastOneOptionsOpened: boolean;
}) {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const theme = useTheme();
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);
  const [value, setValue] = React.useState(0);

  React.useEffect(
    React.useCallback(() => {
      const loadData = async () => {
        const newValue = await updateGaugeRecord(db, gauge, new Date());
        setValue(newValue);
      };
      loadData();
    }, [db]),
  );

  const handleDelete = () => {
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    await dbDeleteGauge(db, gauge.dbId);
    setDeleteDialogVisible(false);
    await loadData();
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    handleOptionsToggle();
  };

  const handleEdit = () => {
    navigation.navigate("EditGaugeScreen", {
      gauge: {
        dbId: gauge.dbId,
        sourceColumn: gauge.sourceColumn,
        operation: gauge.operation,
        emptyTreatment: gauge.emptyTreatment,
        lengthInDays: gauge.lengthInDays,
        precision: gauge.precision,
      },
    });
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={lStyles.optionsContainer}
      onLongPress={handleOptionsToggle}
    >
      <TouchableOpacity
        style={[
          lStyles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleEdit}
      >
        <Text
          style={[
            lStyles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Edit")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          lStyles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleDelete}
      >
        <Text
          style={[
            lStyles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Delete")}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{}}>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Delete confirmation")}
        message={t("Do you want to remove ") + gauge.sourceColumn.label + "?"}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {optionsOpened && renderOptions()}

      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleOptionsToggle}
        disabled={atLeastOneOptionsOpened}
        style={[
          lStyles.itemContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
          optionsOpened && lStyles.optionsOpened,
        ]}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemLabel}>
            <Text style={[lStyles.itemTitle, { color: theme.colors.text }]}>
              {gauge.sourceColumn.label}
            </Text>
            <Text
              style={[styles.itemText, { color: theme.colors.textSecondary }]}
            >
              {gauge.operation}
            </Text>
            <Text
              style={[styles.itemText, { color: theme.colors.textSecondary }]}
            >
              {gauge.emptyTreatment}
            </Text>
          </View>

          <Text style={[styles.itemValue, { color: theme.colors.text }]}>
            {value.toFixed(gauge.precision)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function GaugesListScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [gauges, setGauges] = React.useState<Gauge[]>([]);
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);
  const atLeastOneOptionsOpened = React.useMemo(
    () => optionsOpened.some((v) => v),
    [optionsOpened],
  );

  const loadData = React.useCallback(async () => {
    const newGauges = await dbGetGauges(db);
    setGauges(newGauges);

    setOptionsOpened(Array.from({ length: newGauges.length }, () => false));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddGauge = () => {
    navigation.navigate("EditGaugeScreen", {});
  };

  const renderEmptyState = () => (
    <View style={lStyles.emptyContainer}>
      <Text style={[lStyles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No gauges added yet")}
      </Text>
    </View>
  );

  const createHandleOptionsToggle = (idx: number) => {
    return () => {
      const newValue = !optionsOpened[idx];
      const newOptionsOpened = Array.from(
        { length: optionsOpened.length },
        (_, it) => (it === idx ? newValue : false),
      );
      setOptionsOpened(newOptionsOpened);
    };
  };

  const handleOptionsOff = () => {
    const newOptionsOpened = Array.from(
      { length: optionsOpened.length },
      () => false,
    );
    setOptionsOpened(newOptionsOpened);
  };

  return (
    <DefaultMainContainer>
      <TouchableOpacity
        style={lStyles.overlay}
        activeOpacity={1}
        onPress={handleOptionsOff}
      >
        <ScrollView
          style={lStyles.mainScrollContainer}
          contentContainerStyle={lStyles.mainScrollContentContainer}
        >
          {gauges.length === 0
            ? renderEmptyState()
            : gauges.map((g, idx) => {
                return (
                  <GaugeListItem
                    key={idx}
                    gauge={g}
                    optionsOpened={optionsOpened[idx]}
                    loadData={loadData}
                    onPress={handleOptionsOff}
                    handleOptionsToggle={createHandleOptionsToggle(idx)}
                    atLeastOneOptionsOpened={atLeastOneOptionsOpened}
                  />
                );
              })}
          <TouchableOpacity
            onPress={handleAddGauge}
            style={[lStyles.addButton, { borderColor: theme.colors.primary }]}
            disabled={atLeastOneOptionsOpened}
          >
            <Text
              style={[lStyles.addButtonText, { color: theme.colors.primary }]}
            >
              {t("+ Add Gauge")}
            </Text>
          </TouchableOpacity>
          <View style={lStyles.bottomMarginContainer}></View>
        </ScrollView>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  itemContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLabel: {
    flex: 1,
    flexDirection: "column",
  },
  itemValue: {
    fontSize: 40,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 4,
  },
});
