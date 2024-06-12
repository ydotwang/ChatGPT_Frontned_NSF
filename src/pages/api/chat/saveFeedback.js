import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { chatId, feedback } = req.body;

    const client = await clientPromise;
    const db = client.db('NsfDatabase');

    const result = await db
      .collection('chats')
      .updateOne({ _id: new ObjectId(chatId) }, { $set: { feedback } });

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: 'Feedback saved successfully' });
    } else {
      res.status(500).json({ message: 'Failed to save feedback' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
