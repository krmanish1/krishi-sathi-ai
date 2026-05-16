import { render, screen, fireEvent } from "@testing-library/react-native";
import { Button } from "@/shared/ui/primitives/Button";
import { Text, View } from "react-native";

describe("Button", () => {
  it("invokes onPress", () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} testID="btn">
        Tap
      </Button>,
    );
    fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).toHaveBeenCalled();
  });

  it("renders child elements", () => {
    render(
      <Button testID="btn2">
        <View>
          <Text>icon</Text>
        </View>
      </Button>,
    );
    expect(screen.getByText("icon")).toBeTruthy();
  });
});
