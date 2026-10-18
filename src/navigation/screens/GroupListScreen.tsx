import React from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
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
  dbGroupHasDosagesOrMeasurements,
  dbGroupHasUnscheduledRecords,
} from "../../models/dbAccess";
import { Group } from "../../models/Frequency";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";
import { cancelGroupNotification } from "../../services/notificationService";
import { lStyles } from "../../commonStyles";

function GroupListItem({
  group,
  hasUsages,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
  atLeastOneOptionsOpened,
}: {
  group: Group;
  hasUsages: boolean;
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
      group: {
        name: group.name,
        color: group.color,
        isReminderOn: group.isReminderOn,
        reminderTime: group.reminderTime,
        dbId: group.dbId,
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
          "Cannot delete a group while it's assigned to schedules or records",
        )}
        closeText={t("Close")}
        onClose={closeDeleteRefusal}
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
        <View style={lStyles.itemContent}>
          <Text style={[lStyles.itemTitle, { color: theme.colors.text }]}>
            {group.name}
          </Text>
          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
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
  const atLeastOneOptionsOpened = React.useMemo(
    () => optionsOpened.some((v) => v),
    [optionsOpened],
  );

  const loadData = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    setGroups(groups);

    const newGroupsWithUsages = new Set<number>();
    for (const group of groups) {
      const hasDosages = await dbGroupHasDosagesOrMeasurements(db, group.dbId);
      const hasRecords = await dbGroupHasUnscheduledRecords(db, group.dbId);
      if (hasDosages || hasRecords) {
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
    <View style={lStyles.emptyContainer}>
      <Text style={[lStyles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No groups yet")}
      </Text>
      <Text
        style={[lStyles.emptySubtext, { color: theme.colors.textTertiary }]}
      >
        {t(
          "Create groups to organize measurments and dosages, and to manage reminders",
        )}
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
                    atLeastOneOptionsOpened={atLeastOneOptionsOpened}
                  />
                );
              })}
          <TouchableOpacity
            onPress={handleAddGroup}
            style={[lStyles.addButton, { borderColor: theme.colors.primary }]}
            disabled={atLeastOneOptionsOpened}
          >
            <Text
              style={[lStyles.addButtonText, { color: theme.colors.primary }]}
            >
              {t("+ Add Group")}
            </Text>
          </TouchableOpacity>
          <View style={lStyles.bottomMarginContainer}></View>
        </ScrollView>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}
