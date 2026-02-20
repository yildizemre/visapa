import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectDropdownProps {
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: object;
  labelAll?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  options,
  onSelect,
  placeholder = 'Seçin',
  leftIcon,
  containerStyle,
  labelAll,
}) => {
  const [visible, setVisible] = useState(false);
  const { width } = useWindowDimensions();

  const displayLabel =
    value === 'all' && labelAll
      ? labelAll
      : options.find((o) => o.value === value)?.label ?? placeholder;

  const allOptions: SelectOption[] = labelAll
    ? [{ label: labelAll, value: 'all' }, ...options]
    : options;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, containerStyle]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <Text style={styles.triggerText} numberOfLines={1}>
          {displayLabel}
        </Text>
        <ChevronDown size={18} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[styles.modalContent, { width: Math.min(width - 32, 280) }]}>
            <FlatList
              data={allOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.value === value && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 12,
    paddingRight: 10,
    minHeight: 44,
    minWidth: 140,
    maxWidth: 200,
  },
  leftIcon: {
    marginRight: 8,
  },
  triggerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 320,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionSelected: {
    backgroundColor: '#334155',
  },
  optionText: {
    color: '#fff',
    fontSize: 15,
  },
});

export default SelectDropdown;
