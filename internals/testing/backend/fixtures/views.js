import { ObjectId } from 'mongodb';
import views from '../../../../seeds/views';


export default views.map(view => Object.assign(view, { _id: ObjectId(view._id.$oid) }));
