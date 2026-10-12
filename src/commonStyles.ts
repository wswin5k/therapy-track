import { StyleSheet } from "react-native";

export const ERROR_BORDER_WIDTH: number = 1.5;
export const DISABLED_OPACITY: number = 0.4;
export const DEFAULT_BORDER_RADIUS: number = 12;
export const PRESSABLE_PADDING_HORIZONTAL: number = 12;
export const PRESSABLE_HEIGHT: number = 54;

//styles for edit screens
export const SECONDARY_EDIT_PRESSABLE_HEIGHT: number = 50;

export const eStyles = StyleSheet.create({
  mainScrollContainer: {
    flex: 1,
  },
  mainScrollContentContainer: {
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
  fullWidthTextInputPressable: {
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
    borderRadius: DEFAULT_BORDER_RADIUS,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
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

export const lStyles = StyleSheet.create({
  mainScrollContainer: {
    flex: 1,
  },
  mainScrollContentContainer: {
    padding: 22,
  },
  bottomMarginContainer: {
    height: 40,
    width: "100%",
  },
  itemContainer: {
    flexDirection: "row",
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemText: {
    fontSize: 17,
    marginBottom: 4,
  },
  overlay: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  optionsOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255, 0, 0, 0.0)",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  optionsButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 40,
    //minWidth: "25%",
    height: 46,
    width: 90,
    maxWidth: "30%",
    justifyContent: "center",
  },
  optionsButtonText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    textAlignVertical: "center",
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
  },
});
