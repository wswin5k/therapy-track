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
  Dimensions,
} from "react-native";
import { useTheme } from "@react-navigation/native";

interface ModalDropdownPickerProps<T> {
  options: T[];
  initialValue: T;
  onValueChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue?: (option: T) => string;
  placeholder?: string;
  pressableStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function DropdownPicker<T>({
  options,
  initialValue,
  onValueChange,
  getLabel,
  getValue,
  placeholder = "Select an option",
  pressableStyle,
  disabled = false,
}: ModalDropdownPickerProps<T>) {
  const theme = useTheme();

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState<T | null>(null);
  const [triggerLayout, setTriggerLayout] = React.useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const triggerRef = React.useRef<View>(null);

  React.useEffect(() => {
    setSelectedValue(initialValue);
  }, [initialValue]);

  const handleSelect = (value: T) => {
    setSelectedValue(value);
    onValueChange(value);
    setModalVisible(false);
  };

  const measureTrigger = () => {
    if (triggerRef.current) {
      triggerRef.current.measure(
        (
          fx: number,
          fy: number,
          width: number,
          height: number,
          px: number,
          py: number,
        ) => {
          setTriggerLayout({ x: px, y: py, width, height });
        },
      );
    }
  };

  const handleOpen = () => {
    if (!disabled) {
      measureTrigger();
      setModalVisible(true);
    }
  };

  const getValueKey = getValue || getLabel;
  const selectedLabel =
    selectedValue !== null ? getLabel(selectedValue) : placeholder;

  const screenHeight = Dimensions.get("window").height;
  const maxDropdownHeight = 250;
  const dropdownGap = 2;

  const shouldPositionAbove =
    triggerLayout.y + triggerLayout.height + maxDropdownHeight + dropdownGap >
    screenHeight - 20;

  const dropdownTop = shouldPositionAbove
    ? triggerLayout.y - maxDropdownHeight - dropdownGap
    : triggerLayout.y + triggerLayout.height + dropdownGap;

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={handleOpen}
        style={[
          styles.triggerButton,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          pressableStyle,
          disabled && styles.disabled,
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            styles.triggerText,
            { color: theme.colors.text },
            selectedValue === null && { color: theme.colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Text style={[styles.chevron, { color: theme.colors.text }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              {
                position: "absolute",
                top: dropdownTop,
                left: triggerLayout.x,
                width: triggerLayout.width,
                maxHeight: maxDropdownHeight,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={styles.optionsList}>
              {options.map((option, index) => {
                const isSelected =
                  selectedValue &&
                  getValueKey(option) === getValueKey(selectedValue);
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelect(option)}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary + "15"
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.text,
                        },
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {getLabel(option)}
                    </Text>
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
  triggerButton: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    overflow: "hidden",
  },
  optionsList: {
    flexGrow: 0,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
  },
  optionText: {
    fontSize: 16,
  },
  selectedOptionText: {
    fontWeight: "600",
  },
});
