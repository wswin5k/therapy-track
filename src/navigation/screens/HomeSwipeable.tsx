import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Home } from "./Home";
import { scheduleOnRN } from "react-native-worklets";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../index";
import { useTranslation } from "react-i18next";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Ionicons from "@react-native-vector-icons/ionicons";
import { TouchableOpacity, View } from "react-native";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import { useSQLiteContext } from "expo-sqlite";
import { dbGetMedicines } from "../../models/dbAccess";

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeTabs"
>;

export function HomeSwipeable() {
  const navigation = useNavigation<HomeNavigationProp>();
  const theme = useTheme();
  const { i18n } = useTranslation();
  const db = useSQLiteContext();

  const offset = useSharedValue(0);

  const [date, setDate] = React.useState<Date>(new Date());
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);
  const [areMedicinesEmpty, setAreMedicinesEmpty] =
    React.useState<boolean>(false);

  const formatDate = React.useCallback(
    (date: Date): string => {
      return date.toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    [i18n.language],
  );

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setIsDatePickerOpened(true)}
          style={{ marginLeft: 16, marginRight: 20 }}
        >
          <Ionicons name="calendar" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme.colors]);

  useFocusEffect(
    React.useCallback(() => {
      const newDate = new Date();
      setDate(newDate);
      navigation.setOptions({ title: formatDate(newDate) });
    }, [navigation, formatDate]),
  );

  const loadMedicines = React.useCallback(async () => {
    const medicines = await dbGetMedicines(db);
    if (medicines.length > 0) {
      setAreMedicinesEmpty(false);
    } else {
      setAreMedicinesEmpty(true);
    }
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadMedicines();
    }, [loadMedicines]),
  );

  const handleDateSwipe = (daysToAdd: number) => {
    let newDate = new Date(date);
    newDate.setDate(date.getDate() + daysToAdd);
    setDate(newDate);
    navigation.setOptions({ title: formatDate(newDate) });
  };

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setIsDatePickerOpened(false);
    if (event.type === "dismissed") {
    } else if (newDate) {
      setDate(newDate);
      navigation.setOptions({ title: formatDate(newDate) });
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((e) => {
      offset.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > 100) {
        scheduleOnRN(handleDateSwipe, -1);
      } else if (e.translationX < -100) {
        scheduleOnRN(handleDateSwipe, 1);
      }
      offset.value = withSpring(0);
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const fabActions = [
    {
      label: "One-off Medicine",
      onPress: () =>
        areMedicinesEmpty
          ? navigation.navigate("EditMedicineScreen", { mode: "one-time" })
          : navigation.navigate("SelectMedicineScreen", {
              mode: "one-time",
              selectedDate: date.toISOString(),
            }),
    },
    {
      label: "Schedule Medicine",
      onPress: () =>
        areMedicinesEmpty
          ? navigation.navigate("EditMedicineScreen", { mode: "schedule" })
          : navigation.navigate("SelectMedicineScreen", { mode: "schedule" }),
    },
    {
      label: "Schedule Assessment",
      onPress: () => {
        navigation.navigate("EditAssessmentScreen", { mode: "schedule" });
      },
    },
    {
      label: "One-off Assessment",
      onPress: () => {
        navigation.navigate("EditAssessmentScreen", { mode: "one-time" });
      },
    },
  ];

  return (
    <View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[{ width: "100%", height: "100%" }, animatedStyles]}
        >
          {isDatePickerOpened ? (
            <RNDateTimePicker
              mode="date"
              value={date}
              onChange={handleDateChange}
            />
          ) : (
            ""
          )}
          <Home date={date} />
        </Animated.View>
      </GestureDetector>
      <FloatingActionButton actions={fabActions} position="right" />
    </View>
  );
}
