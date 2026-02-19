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
  dbDeleteGroup,
  dbGetGroups,
  dbGroupHasDoses,
  dbGroupHasUnscheduledRecords,
} from "../../models/dbAccess";
import { Group } from "../../models/Schedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";
import { cancelGroupNotification } from "../../services/notificationService";

function GroupListItem({
  group,
  hasUsages,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
}: {
  group: Group;
  hasUsages: boolean;
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
    if (hasUsages) {
      setDeleteRefusalDialogVisible(true);
    } else {
      setDeleteDialogVisible(true);
    }
  };

  const confirmDelete = async () => {
    await cancelGroupNotification(group.dbId);
    await dbDeleteGroup(db, group.dbId);
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
    navigation.navigate("EditGroupScreen", {
      group: group,
    });
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={[styles.optionsOverlay, { zIndex: 1, position: "absolute" }]}
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

  const renderReminderStatus = () => {
    if (group.isReminderOn && group.reminderTime) {
      return t("Reminder enabled: ") + group.reminderTime;
    }
    return t("No reminder");
  };

  return (
    <View style={{}}>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Delete confirmation")}
        message={t("Do you want to remove ") + group.name + "?"}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <InformationDialog
        visible={deleteRefusalDialogVisible}
        title={t("Group is in use")}
        message={t(
          "Cannot delete group while it's assigned to doses or records",
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
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px)" : "none",
          },
        ]}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
            {group.name}
          </Text>
          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {renderReminderStatus()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function GroupListScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [groupsWithUsages, setGroupsWithUsages] = React.useState<Set<number>>(
    new Set(),
  );
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);

  const loadData = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    setGroups(groups);

    const newGroupsWithUsages = new Set<number>();
    for (const group of groups) {
      const hasDoses = await dbGroupHasDoses(db, group.dbId);
      const hasRecords = await dbGroupHasUnscheduledRecords(db, group.dbId);
      if (hasDoses || hasRecords) {
        newGroupsWithUsages.add(group.dbId);
      }
    }
    setGroupsWithUsages(newGroupsWithUsages);

    setOptionsOpened(Array.from({ length: groups.length }, () => false));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddGroup = () => {
    navigation.navigate("EditGroupScreen", {});
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No groups yet")}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
        {t("Create groups to organize your medications")}
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
        {groups.length === 0
          ? renderEmptyState()
          : groups.map((g, idx) => {
              return (
                <GroupListItem
                  key={idx}
                  group={g}
                  hasUsages={groupsWithUsages.has(g.dbId)}
                  optionsOpened={optionsOpened[idx]}
                  loadData={loadData}
                  onPress={handleOptionsOff}
                  handleOptionsToggle={createHandleOptionsToggle(idx)}
                />
              );
            })}
        <TouchableOpacity
          onPress={handleAddGroup}
          style={[styles.addButton, { borderColor: theme.colors.primary }]}
        >
          <Text style={styles.addButtonText}>{t("+ Add Group")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  optionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255, 0, 0, 0.0)",
    justifyContent: "space-between",
    alignItems: "center",
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
