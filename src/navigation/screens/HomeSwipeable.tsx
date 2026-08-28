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
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  useWindowDimensions,
  View,
  VirtualizedList,
} from "react-native";
import { dayDifference, serializeDateOnly } from "../../dateOnlyUtils";
import { getTodayDateOnly } from "../../dateOnlyUtils";
import { FloatingActionButton } from "../../components/FloatingActionButton";
type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeSwipeable"
>;

const INIITIAL_INDEX = 10_000;
const TOTAL_ITEMS = 20_000;

export function HomeSwipeable() {
  const navigation = useNavigation<HomeNavigationProp>();
  const theme = useTheme();
  const { i18n } = useTranslation();

  const listRef = React.useRef<VirtualizedList<number>>(null);
  const [currentIndex, setCurrentIndex] = React.useState(INIITIAL_INDEX);

  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);

  const getDate = (slotValue: number) => {
    const newDate = getTodayDateOnly();
    newDate.setDate(newDate.getDate() + slotValue);
    return newDate;
  };
  const getSelectedDateCapped = () => {
    const selectedDate = getDate(currentIndex - INIITIAL_INDEX);
    const today = getTodayDateOnly();
    return selectedDate > today ? today : selectedDate;
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
      const selectedDate = getDate(currentIndex - INIITIAL_INDEX);
      if (listRef.current) {
        listRef.current.scrollToIndex({
          index: currentIndex,
          animated: false,
          viewPosition: 0,
        });
      }
      navigation.setOptions({ title: formatDate(selectedDate) });
    }, [navigation, formatDate, currentIndex]),
  );

  const { width: screenWidth } = useWindowDimensions();
  React.useEffect(() => {
    if (listRef.current) {
      const timeoutId = setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false,
          viewPosition: 0,
        });
      }, 30);
      return () => clearTimeout(timeoutId);
    }
  }, [screenWidth, currentIndex]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const landedIndex = Math.round(offsetX / screenWidth);
    setCurrentIndex(landedIndex);

    const newDate = getDate(landedIndex - INIITIAL_INDEX);

    navigation.setOptions({ title: formatDate(newDate) });
  };

  const handleDatePick = (_: DateTimePickerChangeEvent, newDate?: Date) => {
    setIsDatePickerOpened(false);
    if (newDate) {
      const today = getTodayDateOnly();
      const days = dayDifference(today, newDate);
      let targetIndex = 0;
      if (newDate > today) {
        targetIndex = INIITIAL_INDEX + days;
      } else if (newDate < today) {
        targetIndex = INIITIAL_INDEX - days;
      }
      if (targetIndex && listRef.current) {
        setCurrentIndex(targetIndex);
        listRef.current.scrollToIndex({
          index: targetIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }
      navigation.setOptions({ title: formatDate(newDate) });
    }
  };
  const handleDateDismiss = () => {
    setIsDatePickerOpened(false);
  };

  const fabActions = [
    {
      label: "One-time entry",
      onPress: () =>
        navigation.navigate("SelectEntryTypeScreen", {
          mode: "one-time",
          selectedDate: serializeDateOnly(getSelectedDateCapped()),
        }),
    },
    {
      label: "Schedule",
      onPress: () =>
        navigation.navigate("SelectEntryTypeScreen", {
          mode: "schedule",
          selectedDate: serializeDateOnly(getSelectedDateCapped()),
        }),
    },
  ];

  const renderHome = ({ item: index }: { item: number }) => {
    const date = getDate(index - INIITIAL_INDEX);
    return (
      <View key={index} style={{ width: screenWidth }}>
        <Home date={date} />
      </View>
    );
  };

  return (
    <View style={[{ width: "100%", height: "100%" }]}>
      {isDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={getDate(currentIndex - INIITIAL_INDEX)}
          onValueChange={handleDatePick}
          onDismiss={handleDateDismiss}
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
        snapToInterval={screenWidth}
        decelerationRate={0.9}
        disableIntervalMomentum={true}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        initialScrollIndex={INIITIAL_INDEX}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
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
