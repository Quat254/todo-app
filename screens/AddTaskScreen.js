import { useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';

export default function AddTaskScreen({ navigation, route }) {
  const [taskTitle, setTaskTitle] = useState('');
  const { addTask } = route.params;

  const saveTask = () => {
    if (taskTitle.trim() === '') return;
    const newTask = { id: Date.now().toString(), title: taskTitle, completed: false };
    addTask(newTask);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Enter task"
        value={taskTitle}
        onChangeText={setTaskTitle}
        style={styles.input}
      />
      <Button title="Save Task" onPress={saveTask} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 50 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10 },
});
