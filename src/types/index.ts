export type BookingStep =
  | 'SELECT_ROOM'
  | 'ENTER_CHECKIN'
  | 'ENTER_CHECKOUT'
  | 'ENTER_GUESTS'
  | 'ENTER_NAME'
  | 'ENTER_PHONE'
  | 'CONFIRM';

export interface BookingSession {
  userId: string;
  step: BookingStep;
  roomId?: string;
  roomName?: string;
  roomPrice?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  guestName?: string;
  phone?: string;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  price: number;
  capacity: number;
  description: string;
  amenities: string[];
  available: boolean;
}

export interface Booking {
  bookingId: string;
  userId: string;
  lineDisplayName?: string;
  roomName: string;
  roomPrice: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  phone: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface FAQ {
  question: string;
  answer: string;
  category: string;
}
