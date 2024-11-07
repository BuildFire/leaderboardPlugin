class Score {
  constructor(data = {}) {
    this.createdOn = data.createdOn || new Date();
    this.userId = data.userId || null;
    this.displayName = data.displayName || null;
    this.currentScore = data.currentScore || null;
    this.displayPictureUrl = data.displayPictureUrl || 'https://via.placeholder.com/50';
    this._buildfire = data._buildfire || {};
    this.isActive = (typeof data.isActive === 'undefined') ? true : data.isActive;
    this.createdOn = data.createdOn || undefined;
    this.createdBy = data.createdBy || undefined;
    this.lastUpdatedOn = data.lastUpdatedOn || undefined;
    this.lastUpdatedBy = data.lastUpdatedBy || undefined;
    this.deletedOn = data.deletedOn || undefined;
    this.deletedBy = data.deletedBy || undefined;
  }
}
