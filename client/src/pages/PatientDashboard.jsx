import { useState } from 'react';
import Layout from '../components/Layout';
import BookAppointment from '../components/BookAppointment';
import MyAppointments from '../components/MyAppointments';
import MedicalHistory from '../components/MedicalHistory';
import Chatbot from '../components/Chatbot';

function PatientDashboard({ user }) {
  const [tab, setTab] = useState('book');

  const items = [
    { key: 'book', label: 'Book Appointment' },
    { key: 'appointments', label: 'My Appointments' },
    { key: 'history', label: 'Medical History' },
    { key: 'chat', label: 'Chatbot' },
  ];

  const subtitles = {
    book: 'Pick a department, choose your doctor, and confirm a slot in under a minute.',
    appointments: 'Track your bookings and your place in the live queue.',
    history: 'Notes, prescriptions and follow-ups from your past visits.',
    chat: 'Ask the hospital assistant about booking, queues and doctors.',
  };

  return (
    <Layout user={user} items={items} active={tab} onSelect={setTab} subtitle={subtitles[tab]}>
      {tab === 'book' && <BookAppointment />}
      {tab === 'appointments' && <MyAppointments />}
      {tab === 'history' && <MedicalHistory />}
      {tab === 'chat' && <Chatbot />}
    </Layout>
  );
}

export default PatientDashboard;