import { View } from "react-native";
import { Card, Text } from "react-native-paper";

type ProductData = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export default function ProductCard({ data }: { data: ProductData }) {
  return (
    <Card>
      <Card.Title title={data.name} />
      <Card.Content>
        <Text>{data.description}</Text>
        <Text>${data.price.toFixed(2)}</Text>
      </Card.Content>
    </Card>
  );
}
