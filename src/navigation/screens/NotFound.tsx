import { Text, Button } from "@react-navigation/elements";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

export function NotFound() {
  return (
    <DefaultMainContainer justifyContent="center">
      <Text>404</Text>
      <Button screen="HomeTabs">Go to Home</Button>
    </DefaultMainContainer>
  );
}
