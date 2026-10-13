package §_-2g§
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.geom.Point;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol246")]
   public class §_-3Y§ extends MovieClip
   {
      
      public var §_-0c§:Number = 0;
      
      public var §_-1t§:Number = 0;
      
      public function §_-3Y§()
      {
         super();
         addEventListener(Event.ENTER_FRAME,this.handleEnterFrame);
         addEventListener(Event.ADDED_TO_STAGE,this.§_-F§);
      }
      
      private function §_-F§(param1:Event) : void
      {
         var _loc2_:Point = new Point(this.x,this.y);
         _loc2_ = parent.localToGlobal(_loc2_);
         this.§_-0c§ = _loc2_.x;
         this.§_-1t§ = _loc2_.y;
         addEventListener(Event.ENTER_FRAME,this.handleEnterFrame);
         addEventListener(Event.REMOVED_FROM_STAGE,this.handleRemove);
         removeEventListener(Event.ADDED_TO_STAGE,this.§_-F§);
      }
      
      private function handleRemove(param1:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.handleEnterFrame);
         removeEventListener(Event.REMOVED_FROM_STAGE,this.handleRemove);
      }
      
      private function handleEnterFrame(param1:Event) : void
      {
         var _loc2_:Point = new Point(this.x,this.y);
         _loc2_ = parent.localToGlobal(_loc2_);
         this.§_-0c§ = _loc2_.x;
         this.§_-1t§ = _loc2_.y;
      }
   }
}

