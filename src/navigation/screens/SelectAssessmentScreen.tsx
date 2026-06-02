import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { dbGetAssessments } from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ModalPicker } from "../../components/ModalPicker";
import { Assessment } from "../../models/AssessmentSchedule";

export function SelectAssessmentScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [assessments, setAssessments] = React.useState<Assessment[]>([]);

  const mode = (route.params as { mode: "schedule" | "one-time" }).mode;
  const selectedDate = (
    route.params as { mode: "schedule" | "one-time"; selectedDate?: string }
  ).selectedDate;

  useFocusEffect(
    React.useCallback(() => {
      async function setup() {
        const result = await dbGetAssessments(db);
        setAssessments(result);
      }
      setup();
    }, [db]),
  );

  const handleAddNewAssessment = () => {
    navigation.navigate("EditAssessmentScreen", { mode: mode });
  };

  const handleSelectAssessment = (assessment?: Assessment) => {
    if (!assessment) {
      return;
    }
    if (mode === "schedule") {
      navigation.navigate("EditAssessmentScheduleScreen", {
        assessment: assessment,
      });
    } else {
      // mode === "one-time"
      navigation.navigate("EditSingleMeasurmentScreen", {
        assessment: assessment,
        selectedDate: selectedDate,
      });
    }
  };

  return (
    <DefaultMainContainer justifyContent="center">
      {assessments.length > 0 && (
        <ModalPicker
          values={assessments}
          onValueChange={handleSelectAssessment}
          getLabel={(a) => a.name}
          placeholder="Select existing assessment"
          selectedValue={null}
          pressableStyle={styles.fullWidthPickerContainer}
        />
      )}

      <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
        {t("or")}
      </Text>

      <TouchableOpacity
        onPress={handleAddNewAssessment}
        style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={styles.nextButtonText}>{t("Add new assessment")}</Text>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  headerLabel: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    margin: 15,
  },
  fullWidthPickerContainer: {
    maxWidth: "80%",
    width: 300,
    height: 60,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignSelf: "center",
    padding: 15,
  },
  nextButton: {
    maxWidth: "80%",
    width: 300,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 17.5,
    fontWeight: "500",
  },
});
