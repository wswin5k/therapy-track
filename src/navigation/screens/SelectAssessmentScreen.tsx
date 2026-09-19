import React from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
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
import { sStyles } from "../../commonStyles";

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
      navigation.navigate("EditSingleMeasurementScreen", {
        assessment: assessment,
        selectedDate: selectedDate,
      });
    }
  };

  return (
    <DefaultMainContainer>
      <View style={sStyles.selectMainContainer}>
        {assessments.length > 0 && (
          <ModalPicker
            values={assessments}
            onValueChange={handleSelectAssessment}
            getLabel={(a) => a.name}
            placeholder="Select existing assessment"
            selectedValue={null}
            pressableStyle={sStyles.picker}
          />
        )}

        <Text style={[sStyles.labelText, { color: theme.colors.text }]}>
          {t("or")}
        </Text>

        <TouchableOpacity
          onPress={handleAddNewAssessment}
          style={[sStyles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={sStyles.buttonText}>{t("Add new assessment")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}
