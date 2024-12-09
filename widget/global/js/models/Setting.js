/* eslint-disable max-len */
class Setting {
  constructor(data = {}) {
    this.features = data.features || []; /* FTQ Instance Obj */
    this.notificationsFrequency = data.notificationsFrequency || []; // array of enabled notifications keys
    this.userEarnPoints = data.userEarnPoints || enums.EARN_POINTS.HONOR_SYSTEM; // how to add points
    this.calculateLoyaltyPoints = typeof data.calculateLoyaltyPoints === 'boolean' ? data.calculateLoyaltyPoints : false;
    this.isAnalyticsRegistered = typeof data.isAnalyticsRegistered === 'boolean' ? data.isAnalyticsRegistered : false;
  }
}
