import React, { useState } from 'react';
import { Modal, Button, Form, DatePicker, Input, Select } from 'antd';
import { addInspection } from '../services/firebaseService';

const { TextArea } = Input;
const { Option } = Select;

const InspectionPlanModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Convert moment date objects to timestamp
      const formattedValues = {
        ...values,
        scheduledDate: values.scheduledDate.valueOf(),
        createdAt: Date.now(),
        status: 'Scheduled'
      };
      
      await addInspection(formattedValues);
      setLoading(false);
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('Failed to add inspection:', error);
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Plan New Inspection/Audit"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Schedule
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Inspection Title"
          rules={[{ required: true, message: 'Please enter inspection title' }]}
        >
          <Input placeholder="Enter inspection title" />
        </Form.Item>
        
        <Form.Item
          name="type"
          label="Type"
          rules={[{ required: true, message: 'Please select inspection type' }]}
        >
          <Select placeholder="Select inspection type">
            <Option value="safety">Safety</Option>
            <Option value="quality">Quality</Option>
            <Option value="environment">Environment</Option>
            <Option value="regulatory">Regulatory</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="location"
          label="Location"
          rules={[{ required: true, message: 'Please enter location' }]}
        >
          <Input placeholder="Enter inspection location" />
        </Form.Item>
        
        <Form.Item
          name="scheduledDate"
          label="Scheduled Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item
          name="assignedTo"
          label="Assigned To"
          rules={[{ required: true, message: 'Please enter assignee' }]}
        >
          <Input placeholder="Enter name of person responsible" />
        </Form.Item>
        
        <Form.Item name="description" label="Description">
          <TextArea rows={4} placeholder="Enter details about this inspection" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InspectionPlanModal;
