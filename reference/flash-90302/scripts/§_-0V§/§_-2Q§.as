package §_-0V§
{
   import §_-2g§.§var§;
   import bobby.§_-3e§;
   import flash.display.MovieClip;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol196")]
   public class §_-2Q§ extends §_-h§
   {
      
      public var overheadSwing:Symbol30copy2ragdag;
      
      public var servePoint:MovieClip;
      
      public var underHitbox:MovieClip;
      
      public var underhandSwing:Symbol30copy2agr;
      
      public var serveSwing:Symbol30copy3;
      
      public var computerHitbox:MovieClip;
      
      public function §_-2Q§()
      {
         addFrameScript(0,this.frame1);
         super();
         §case § = 1;
         include = 1.15;
         §do§ = 0.96;
         §_-4d§.push("I\'ve got a big personality!");
         §_-5c§.push("What\'s that racket? It\'s getting loud in here.");
         §_-5c§.push("I\'m just getting warmed up!");
         §_-1H§.push("Beginner\'s luck.");
         §_-1H§.push("Try that again, \nI dare you.");
         §_-2I§.push("I\'m just getting warmed up!");
         §_-X§.push("Good match!");
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
      }
      
      override public function setupTrashTalk(param1:String) : void
      {
         var _loc2_:§var§ = new §var§(param1);
         §_-h§(this).addChild(_loc2_);
         _loc2_.x = -20 * §_-3e§.§_-1w§(scaleX);
         _loc2_.y = -47;
         _loc2_.scaleX *= §_-3e§.§_-1w§(scaleX);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

