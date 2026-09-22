import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { dbGetAssessments, dbGetMedicines } from "../../models/dbAccess";
import React from "react";
import { useSQLiteContext } from "expo-sqlite";
import { sStyles } from "../../commonStyles";

export function SelectEntryTypeScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useTheme();
  const db = useSQLiteContext();

  const { mode, selectedDate } = route.params as {
    mode: "schedule" | "one-time";
    selectedDate: string;
  };

  const [areMedicinesEmpty, setAreMedicinesEmpty] =
    React.useState<boolean>(false);
  const [areAssessmentsEmpty, setAreAssessmentsEmpty] =
    React.useState<boolean>(false);

  const loadMedicinesAndAssessments = React.useCallback(async () => {
    const medicines = await dbGetMedicines(db);
    if (medicines.length > 0) {
      setAreMedicinesEmpty(false);
    } else {
      setAreMedicinesEmpty(true);
    }
    const assessments = await dbGetAssessments(db);
    if (assessments.length > 0) {
      setAreAssessmentsEmpty(false);
    } else {
      setAreAssessmentsEmpty(true);
    }
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadMedicinesAndAssessments();
    }, [loadMedicinesAndAssessments]),
  );

  const handleSelectMedicine = () => {
    if (areMedicinesEmpty) {
      navigation.navigate("EditMedicineScreen", { mode: mode });
    } else {
      navigation.navigate("SelectMedicineScreen", {
        mode: mode,
        selectedDate: selectedDate,
      });
    }
  };

  const handleSelectAssessment = () => {
    if (areAssessmentsEmpty) {
      navigation.navigate("EditAssessmentScreen", { mode: mode });
    } else {
      navigation.navigate("SelectAssessmentScreen", {
        mode: mode,
        selectedDate: selectedDate,
      });
    }
  };

  return (
    <DefaultMainContainer>
      <View style={sStyles.selectMainContainer}>
        <TouchableOpacity
          onPress={handleSelectMedicine}
          style={[sStyles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text
            style={[sStyles.buttonText, { color: theme.colors.textOnPrimary }]}
          >
            {t("Medicine")}
          </Text>
        </TouchableOpacity>

        <Text style={[sStyles.labelText, { color: theme.colors.text }]}>
          {t("or")}
        </Text>

        <TouchableOpacity
          onPress={handleSelectAssessment}
          style={[sStyles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text
            style={[sStyles.buttonText, { color: theme.colors.textOnPrimary }]}
          >
            {t("Assessment")}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}
