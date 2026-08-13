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
import {
  dbDeleteAssessment,
  dbGetAssessments,
  dbGetAssessmentSchedules,
} from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";
import { Assessment } from "../../models/AssessmentSchedule";
import { assessmentTypeToDisplayForm } from "../enumMappings";

function AssessmentListItem({
  assessment,
  hasSchedules,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
}: {
  assessment: Assessment;
  hasSchedules: boolean;
  loadData: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const theme = useTheme();
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);
  const [deleteRefusalDialogVisible, setDeleteRefusalDialogVisible] =
    React.useState(false);

  const handleDelete = () => {
    if (hasSchedules) {
      setDeleteRefusalDialogVisible(true);
    } else {
      setDeleteDialogVisible(true);
    }
  };

  const confirmDelete = async () => {
    await dbDeleteAssessment(db, assessment.dbId);
    setDeleteDialogVisible(false);
    await loadData();
  };

  const closeDeleteRefusal = () => {
    setDeleteRefusalDialogVisible(false);
    handleOptionsToggle();
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    handleOptionsToggle();
  };

  const handleEdit = () => {
    navigation.navigate("EditAssessmentScreen", {
      assessment: assessment,
      mode: "save-and-go-back",
    });
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={[styles.optionsOverlay]}
      onLongPress={handleOptionsToggle}
    >
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleEdit}
      >
        <Text style={styles.optionsButtonText}>{t("Edit")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleDelete}
      >
        <Text style={styles.optionsButtonText}>{t("Delete")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleOptionsToggle}
      >
        <Text style={styles.optionsButtonText}>{t("Cancel")}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{}}>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Delete confirmation")}
        message={t("Do you want to remove ") + assessment.name + "?"}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <InformationDialog
        visible={deleteRefusalDialogVisible}
        title={t("Assessment has schedules")}
        message={t(
          "Deletetion of the assessment has been refused, because " +
            "it has connected schedules. " +
            "They need to be deleted before the assessment.",
        )}
        closeText={t("Close")}
        onClose={closeDeleteRefusal}
      />

      {optionsOpened && renderOptions()}

      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleOptionsToggle}
        style={[
          styles.itemContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px)" : "none",
          },
        ]}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
            {assessment.name}
          </Text>
          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {t(assessmentTypeToDisplayForm(assessment.type))}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function AssessmentListScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [assessements, setAssessments] = React.useState<Assessment[]>([]);
  const [assessmentsWithSchedules, setAssessmentsWithSchedules] =
    React.useState<Set<number>>(new Set());
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);

  const loadData = React.useCallback(async () => {
    const assessments = await dbGetAssessments(db);
    setAssessments(assessments);

    const schedulesWitAssessments = await dbGetAssessmentSchedules(db);
    const newAssessmentsWithSchedules = new Set<number>();
    schedulesWitAssessments.forEach((s) => {
      newAssessmentsWithSchedules.add(s.assessment.dbId);
    });
    setAssessmentsWithSchedules(newAssessmentsWithSchedules);

    setOptionsOpened(Array.from({ length: assessments.length }, () => false));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No assessments added yet.")}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
        {t("Add an assessment from the Home screen.")}
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
      <ScrollView style={styles.list}>
        {assessements.map((a, idx) => {
          return (
            <AssessmentListItem
              key={idx}
              assessment={a}
              hasSchedules={assessmentsWithSchedules.has(a.dbId)}
              optionsOpened={optionsOpened[idx]}
              loadData={loadData}
              onPress={handleOptionsOff}
              handleOptionsToggle={createHandleOptionsToggle(idx)}
            />
          );
        })}
        {assessements.length === 0 && renderEmptyState()}
      </ScrollView>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemText: {
    fontSize: 15,
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  optionsOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255, 0, 0, 0.0)",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
    position: "absolute",
  },
  optionsButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: "25%",
  },
  optionsButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
