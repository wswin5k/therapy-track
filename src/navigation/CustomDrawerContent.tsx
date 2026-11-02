import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import {
  CommonActions,
  DrawerActions,
  useLinkBuilder,
  useTheme,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Text, StyleSheet, View } from "react-native";

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation, descriptors } = props;

  const { buildHref } = useLinkBuilder();

  const theme = useTheme();
  const { t } = useTranslation();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  const {
    drawerActiveTintColor,
    drawerInactiveTintColor,
    drawerActiveBackgroundColor,
    drawerInactiveBackgroundColor,
  } = focusedOptions;

  const renderGroup = (startIdx: number, endIdx: number) => {
    const routes = state.routes.slice(startIdx, endIdx);

    return routes.map((route, idx: number) => {
      const focused = startIdx + idx === state.index;

      const onPress = () => {
        const event = navigation.emit({
          type: "drawerItemPress",
          target: route.key,
          canPreventDefault: true,
        });

        if (!event.defaultPrevented) {
          navigation.dispatch({
            ...(focused
              ? DrawerActions.closeDrawer()
              : CommonActions.navigate(route.name, route.params)),
            target: state.key,
          });
        }
      };

      const {
        title,
        drawerLabel,
        drawerIcon,
        drawerLabelStyle,
        drawerItemStyle,
        drawerItemTestID,
        drawerAllowFontScaling,
      } = descriptors[route.key].options;

      return (
        <DrawerItem
          key={route.key}
          route={route}
          href={buildHref(route.name, route.params)}

          label={
            drawerLabel !== undefined
              ? drawerLabel
              : title !== undefined
                ? title
                : route.name
          }
          icon={drawerIcon}
          focused={focused}
          activeTintColor={drawerActiveTintColor}
          inactiveTintColor={drawerInactiveTintColor}
          activeBackgroundColor={drawerActiveBackgroundColor}
          inactiveBackgroundColor={drawerInactiveBackgroundColor}
          allowFontScaling={drawerAllowFontScaling}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle}
          onPress={onPress}
          testID={drawerItemTestID}
        />
      );
    });
  };

  const renderSeparator = (label: string) => {
    return (
      <View style={styles.separatorContainer}>
        <View
          style={[
            styles.separtorLine,
            { backgroundColor: theme.colors.textSecondary },
          ]}
        />

        <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>

        <View
          style={[
            styles.separtorLine,
            { backgroundColor: theme.colors.textSecondary },
          ]}
        />
      </View>
    );
  };

  return (
    <DrawerContentScrollView
      contentContainerStyle={styles.contentContainer}
      style={{}}
      {...props}
    >
      {renderGroup(0, 1)}

      {renderSeparator(t("Scheduling"))}
      {renderGroup(1, 5)}

      {renderSeparator(t("History"))}
      {renderGroup(5, 7)}

      <View style={styles.bottomMarginContainer}></View>
      {renderGroup(7, 8)}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  labelText: {
    fontSize: 15,
    fontWeight: "500",
    marginVertical: 14,
    textAlign: "center",
  },
  contentContainer: {
    flexGrow: 1,
  },
  bottomMarginContainer: {
    height: 20,
    width: "100%",
  },
  separatorContainer: { flexDirection: "row", justifyContent: "center" },
  separtorLine: {
    height: 1,
    marginHorizontal: 12,
    flex: 1,
    alignSelf: "center",
    opacity: 0.5,
  },
});
