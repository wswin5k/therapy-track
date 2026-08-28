import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ViewStyle,
  StyleProp,
  ToastAndroid,
  Platform,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  DISABLED_OPACITY,
  ERROR_BORDER_WIDTH,
} from "../navigation/commonConsts";

interface ModalPickerProps<T> {
  values: T[];
  onValueChange: (value: T) => void;
  getLabel: (value: T) => string;
  selectedValue: T | null;
  placeholder?: string;
  pressableStyle?: StyleProp<ViewStyle>;
  showTitle?: boolean;
  error?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

export function ModalPicker<T>({
  values,
  onValueChange,
  getLabel,
  selectedValue = null,
  placeholder = "Select an option",
  pressableStyle,
  showTitle = false,
  error = false,
  disabled = false,
  disabledMessage = undefined,
}: ModalPickerProps<T>) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const theme = useTheme();
  const [numberOfPresses, setNumberOfPresses] = React.useState(0);

  const handleSelect = (value: T) => {
    if (disabled) {
      return;
    }
    onValueChange(value);
    setModalVisible(false);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handlePress = () => {
    if (disabled && disabledMessage && Platform.OS === "android") {
      setNumberOfPresses((prev) => prev + 1);
      if (numberOfPresses > 2) {
        ToastAndroid.show(disabledMessage, ToastAndroid.SHORT);
      }
    } else {
      setModalVisible(true);
    }
  };

  const getLabelSafe = (value: T | null): string => {
    return value ? getLabel(value) : placeholder;
  };

  const selectedLabel = getLabelSafe(selectedValue);

  const renderTitle = () => {
    return (
      <View
        style={[
          styles.listItem,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <Text style={[styles.titleText, { color: theme.colors.text }]}>
          {placeholder}
        </Text>
        <TouchableOpacity
          onPress={handleModalClose}
          style={styles.titleCloseButton}
        >
          <Text
            style={[styles.titleCloseButtonText, { color: theme.colors.text }]}
          >
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.defaultPressableStyle,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          pressableStyle,
          disabled && {
            opacity: DISABLED_OPACITY,
          },
          error && {
            borderColor: theme.colors.error,
            borderWidth: ERROR_BORDER_WIDTH,
          },
        ]}
      >
        <Text
          style={[
            styles.defaultPressableText,
            { color: theme.colors.text },
            (!selectedValue || disabled) && {
              color: theme.colors.textTertiary,
            },
          ]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Text
          style={[
            styles.chevron,
            disabled
              ? { color: theme.colors.textTertiary }
              : { color: theme.colors.text },
          ]}
        >
          ▼
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={handleModalClose}
        animationType="fade"
      >
        {showTitle}
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleModalClose}
        >
          <View
            style={[
              styles.listContent,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {showTitle && renderTitle()}
            <ScrollView>
              {values.map((value, index) => {
                const isSelected = value === selectedValue;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelect(value)}
                    style={[
                      styles.listItem,
                      {
                        borderBottomColor: theme.colors.border,
                      },
                      isSelected && {
                        backgroundColor: theme.colors.primary + "20",
                      },
                      index === values.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.listItemText,
                        {
                          color: isSelected
                            ? theme.colors.text
                            : theme.colors.text,
                        },
                        isSelected && styles.selectedItemText,
                      ]}
                    >
                      {getLabelSafe(value)}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        style={[
                          styles.checkmark,
                          { color: theme.colors.primary },
                        ]}
                        name="checkmark"
                      ></Ionicons>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  defaultPressableStyle: {
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  defaultPressableText: {
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderRadius: 10,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "600",
  },
  titleCloseButton: {
    padding: 4,
  },
  titleCloseButtonText: {
    fontSize: 24,
    fontWeight: "300",
  },
  listContent: {
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: "70%",
    width: "85%",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  listItemText: {
    fontSize: 16,
    overflow: "hidden",
  },
  selectedItemText: {
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 20,
  },
});
