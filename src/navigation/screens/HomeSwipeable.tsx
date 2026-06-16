import React from "react";
import { Home } from "./Home";
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
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  View,
  VirtualizedList,
} from "react-native";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import { useSQLiteContext } from "expo-sqlite";
import { dbGetAssessments, dbGetMedicines } from "../../models/dbAccess";
import { Dimensions } from "react-native";
import { dayDifference } from "../utils";
type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeTabs"
>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const INIITIAL_INDEX = 10_000;
const TOTAL_ITEMS = 20_000;

function getToday(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

export function HomeSwipeable() {
  const navigation = useNavigation<HomeNavigationProp>();
  const theme = useTheme();
  const { i18n } = useTranslation();
  const db = useSQLiteContext();

  const listRef = React.useRef<VirtualizedList<number>>(null);

  const [date, setDate] = React.useState<Date>(getToday());
  const [datePickerDate, setDatePickerDate] = React.useState<Date>(getToday());
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);
  const [areMedicinesEmpty, setAreMedicinesEmpty] =
    React.useState<boolean>(false);
  const [areAssessmentsEmpty, setAreAssessmentsEmpty] =
    React.useState<boolean>(false);

  const getDate = (slotValue: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + slotValue);
    return newDate;
  };

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
      const newDate = getToday();
      setDate(newDate);
      if (listRef.current) {
        listRef.current.scrollToIndex({
          index: INIITIAL_INDEX,
          animated: false,
          viewPosition: 0.5,
        });
      }
      navigation.setOptions({ title: formatDate(newDate) });
    }, [navigation, formatDate]),
  );

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

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const landedIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newDate = getDate(landedIndex - INIITIAL_INDEX);
    setDatePickerDate(newDate);
    navigation.setOptions({ title: formatDate(newDate) });
  };

  const handleDatePick = (event: DateTimePickerEvent, newDate?: Date) => {
    setIsDatePickerOpened(false);
    if (event.type === "dismissed") {
    } else if (newDate) {
      const days = dayDifference(date, newDate);
      let targetIndex = 0;
      if (newDate > date) {
        targetIndex = INIITIAL_INDEX + days;
      } else if (newDate < date) {
        targetIndex = INIITIAL_INDEX - days;
      }
      if (targetIndex && listRef.current) {
        listRef.current.scrollToIndex({
          index: targetIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }
      setDatePickerDate(newDate);
      navigation.setOptions({ title: formatDate(newDate) });
    }
  };
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
      onPress: () =>
        areAssessmentsEmpty
          ? navigation.navigate("EditAssessmentScreen", { mode: "schedule" })
          : navigation.navigate("SelectAssessmentScreen", { mode: "schedule" }),
    },
    {
      label: "One-off Assessment",
      onPress: () =>
        areAssessmentsEmpty
          ? navigation.navigate("EditAssessmentScreen", { mode: "one-time" })
          : navigation.navigate("SelectAssessmentScreen", {
              mode: "one-time",
              selectedDate: date.toISOString(),
            }),
    },
  ];

  const renderHome = ({ item: index }: { item: number }) => {
    const currentDate = getDate(index - INIITIAL_INDEX);
    return (
      <View key={index} style={{ width: SCREEN_WIDTH }}>
        <Home date={currentDate} />
      </View>
    );
  };

  return (
    <View style={[{ width: "100%", height: "100%" }]}>
      {isDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={datePickerDate}
          onChange={handleDatePick}
        />
      ) : (
        ""
      )}
      <VirtualizedList
        ref={listRef}
        initialNumToRender={3}
        getItemCount={() => TOTAL_ITEMS}
        getItem={(_, index) => index}
        renderItem={renderHome}
        keyExtractor={(item) => item.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate={0.9}
        disableIntervalMomentum={true}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        initialScrollIndex={INIITIAL_INDEX}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
      />
      <FloatingActionButton actions={fabActions} position="right" />
    </View>
  );
}
