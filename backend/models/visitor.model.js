import { DataTypes, Model } from 'sequelize';
import sequelize from '../db/dbConfig.js';

class Visitor extends Model {}

Visitor.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    visitor_uid: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    first_seen: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_seen: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    visits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    user_agent: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    sequelize,
    modelName: 'Visitor',
    tableName: 'visitors',
    underscored: true,
  }
);

export default Visitor;
