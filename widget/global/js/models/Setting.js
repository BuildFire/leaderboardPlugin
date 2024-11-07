/* eslint-disable max-len */
class Settings {
  constructor(data = {}) {
    this.features = data.features || [], /* FTQ Instance Obj */
    this.notificationsFrequency = data.notificationsFrequency || []; // array of enabled notifications keys
    this.userEarnPoints = 'HONOR_SYSTEM'; // how to add points
    this.calculateLoyaltyPoints = typeof data.calculateLoyaltyPoints === 'boolean' ? data.calculateLoyaltyPoints : false;
  }
}
