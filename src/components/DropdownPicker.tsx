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
import { ERROR_BORDER_WIDTH } from "../navigation/commonConsts";
import { gstyles } from "../commonStyles";

interface ModalDropdownPickerProps<T> {
  options: T[];
  initialValue: T;
  onValueChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue?: (option: T) => string;
  placeholder?: string;
  pressableStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  error?: boolean;
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
  error = false,
}: ModalDropdownPickerProps<T>) {
  const theme = useTheme();

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState<T>(initialValue);
  const [triggerLayout, setTriggerLayout] = React.useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const triggerRef = React.useRef<View>(null);

  const handleSelect = (value: T) => {
    setSelectedValue(value);
    onValueChange(value);
    setModalVisible(false);
  };

  const measureTrigger = () => {
    if (triggerRef.current) {
      triggerRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          setTriggerLayout({ x: pageX, y: pageY, width, height });
        },
      );
    }
  };

  const handleButtonLaoyt = () => {
    measureTrigger();
  };

  const handleOpen = () => {
    if (!disabled) {
      measureTrigger();
      setModalVisible(true);
    }
  };

  const getValueKey = getValue || getLabel;
  const selectedLabel = React.useMemo(
    () => (selectedValue !== null ? getLabel(selectedValue) : placeholder),
    [placeholder, getLabel, selectedValue],
  );

  const screenHeight = Dimensions.get("window").height;
  const MAX_DROPDOWN_HEIGHT = 250;
  const DROPDOWN_GAP = 1;
  const SCREEN_EDGE_PADDING = 20;

  const belowPositionY = triggerLayout.y + triggerLayout.height + DROPDOWN_GAP;
  const centerPositionY = triggerLayout.y + triggerLayout.height / 2;

  const fitsBelow =
    belowPositionY + MAX_DROPDOWN_HEIGHT < screenHeight - SCREEN_EDGE_PADDING;
  const shouldPositionBelow = fitsBelow || centerPositionY < screenHeight / 2;

  let dropdownTop = undefined;
  let dropdownBottom = undefined;
  let dropdownHeight = MAX_DROPDOWN_HEIGHT;
  if (shouldPositionBelow) {
    dropdownTop = belowPositionY;
    dropdownHeight = Math.min(
      MAX_DROPDOWN_HEIGHT,
      screenHeight - SCREEN_EDGE_PADDING - belowPositionY,
    );
  } else {
    dropdownHeight = Math.min(
      MAX_DROPDOWN_HEIGHT,
      triggerLayout.y - SCREEN_EDGE_PADDING,
    );
    dropdownBottom = screenHeight - triggerLayout.y + DROPDOWN_GAP;
  }

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={handleOpen}
        onLayout={handleButtonLaoyt}
        style={[
          gstyles.pressable,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          pressableStyle,
          disabled && styles.disabled,
          error && {
            borderColor: theme.colors.error,
            borderWidth: ERROR_BORDER_WIDTH,
          },
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            gstyles.pressableText,
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
                bottom: dropdownBottom,
                left: triggerLayout.x,
                width: triggerLayout.width,
                maxHeight: dropdownHeight,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
            >
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
                        gstyles.pressableText,
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
  selectedOptionText: {
    fontWeight: "600",
  },
});
