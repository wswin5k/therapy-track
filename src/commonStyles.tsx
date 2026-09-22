import { StyleSheet } from "react-native";

export const DEFAULT_BORDER_RADIUS: number = 8;
export const PRESSABLE_PADDING_HORIZONTAL: number = 12;

//styles for edit screens
export const EDIT_PRESSABLE_HEIGHT: number = 54;

export const eStyles = StyleSheet.create({
  editMainScrollContainer: {
    flex: 1,
  },
  editMainScrollContentContainer: {
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
    height: EDIT_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    fontSize: 18,
    width: "100%",
  },
  pressable: {
    height: EDIT_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePressable: {
    height: EDIT_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  timePressable: {
    height: EDIT_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  fullWidthPickerPressable: {
    height: EDIT_PRESSABLE_HEIGHT,
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
    fontSize: 18,
    fontWeight: "bold",
  },
});

// styles for select screens
const SELECT_PRESSABLE_HEIGHT: number = 54;

export const sStyles = StyleSheet.create({
  selectMainContainer: {
    flex: 1,
    justifyContent: "center",
  },
  labelText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    margin: 15,
  },
  button: {
    height: SELECT_PRESSABLE_HEIGHT,
    maxWidth: "80%",
    width: 300,
    paddingVertical: 15,
    borderRadius: DEFAULT_BORDER_RADIUS,
    alignItems: "center",
    alignSelf: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "500",
  },
  picker: {
    height: SELECT_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    justifyContent: "center",
    maxWidth: "80%",
    width: 300,
    alignSelf: "center",
  },
});
