import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TaskItem({ task, onDelete, onToggle }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onToggle(task.id)}>
        <Text style={task.completed ? styles.completed : styles.text}>
          {task.title}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(task.id)}>
        <Text style={styles.delete}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderWidth: 1,
    marginVertical: 5,
    borderRadius: 5,
  },
  text: { fontSize: 16 },
  completed: { fontSize: 16, textDecorationLine: 'line-through', color: 'gray' },
  delete: { color: 'red' },
});
