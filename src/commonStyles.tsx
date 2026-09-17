import { StyleSheet } from "react-native";

export const PRESSABLE_HEIGHT: number = 54;
export const DEFAULT_BORDER_RADIUS: number = 8;
export const PRESSABLE_PADDING_HORIZONTAL: number = 12;

export const gstyles = StyleSheet.create({
  editScrollContainer: {
    flex: 1,
  },
  editScrollContentContainer: {
    paddingTop: 30,
    padding: 22,
  },
  labelText: {
    fontSize: 17,
    fontWeight: "500",
  },
  pressableText: {
    fontSize: 18,
    fontWeight: "400",
  },
  pressableTextInput: {
    height: PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    fontSize: 18,
    width: "100%",
  },
  pressable: {
    height: PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePressable: {
    height: PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  timePressable: {
    height: PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  fullWidthPickerPressable: {
    height: PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    justifyContent: "space-between",
    width: "100%",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  nextButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
