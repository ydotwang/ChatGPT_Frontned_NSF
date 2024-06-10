import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
const { ObjectId } = require('mongodb');

export default async function handler(req, res) {
  try {
    const session = await getSession(req, res);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { user } = session;
    const client = await clientPromise;
    const db = client.db('NsfDatabase');

    const { chatId, intent } = req.body;

    const chat = await db.collection('chats').updateOne(
      {
        _id: new ObjectId(chatId),
        userId: user.sub,
      },
      {
        $set: { intent },
      },
    );

    if (chat.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: 'Chat not found or user not authorized' });
    }

    res.status(200).json({ message: 'Intent saved successfully' });
  } catch (e) {
    console.error('An error occurred:', e);
    res
      .status(500)
      .json({ message: 'An error occurred when saving the intent' });
  }
}
